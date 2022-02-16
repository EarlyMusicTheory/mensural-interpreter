/** @fileoverview  */
"use strict";

/** 
 * @namespace startTimes
 * @desc Functionality to add start times
*/

var startTimes = (function() {
    return {
        /**
         * If event[n] has both a duration assigned to it and a start time,
         * adds a start time for event[n+1]
         * @param {Array} sectionBlocks Array of all the coherent areas of
         * mensurations in a section
         * @param {int} getMode Toggles which values will be retrieved by resp: 
         *                      0 = all values; 1 = interpreter; 2 = user, 3 = corr
         * @memberof startTimes
         */
        addAllStartTimes : function(sectionBlocks, getMode){
            var nextStart = 0;
            var prevPartNum = sectionBlocks[0].part;
            for(var b=0; b<sectionBlocks.length; b++){
                let partNum = sectionBlocks[b].part;
                // startsAt should be resetted at the beginning of a new part
                if (prevPartNum!==partNum)
                {
                    nextStart = 0;
                    prevPartNum = partNum;
                }
                this.addStartTimesForBlock(sectionBlocks[b], nextStart, getMode);
                this.addBreveBoundariesForBlock(sectionBlocks[b], getMode);
                let lastEvent = sectionBlocks[b].events[sectionBlocks[b].events.length-1];
                let lastDur = durIO.readDur(lastEvent, getMode);
                let lastStartsAt = durIO.readStartsAt(lastEvent, getMode);
                nextStart = lastStartsAt + lastDur;
            }
        },

        /**
         * Add start times for all events in block for which that's possible
         * (i.e. where the start and duration of the previous note is known).
         * @param {Object} block Object with attributes for events and
         * mensuration sign
         * @param {Number} startsAtValue manually set starting position
         * @param {int} getMode Toggles which values will be retrieved by resp: 
         *                      0 = all values; 1 = interpreter; 2 = user, 3 = corr
         * @returns {Number} last starting position
         * @memberof startTimes
         */
        addStartTimesForBlock : function(block, startsAtValue, getMode){
            var blockFrom = 0;
            var mens = block.mens;
            var events = block.events;
            // this extra step can be used to do some stuff
            var startsAt = startsAtValue; 
            for(var e=0; e<events.length; e++){
                var event = events[e];
                if(rm.noteOrRest(event)){
                    durIO.setStartsAt(event, blockFrom, startsAt);
                    var dur = durIO.readDur(event, getMode);
                    if(dur){
                        blockFrom += dur;
                        startsAt += dur;
                    }
                }
            }
        },

        /**
         * Indicates where an event falls in larger-scale mensural structures,
         * also singling out which breve beat an event falls on and whether it
         * crosses one (adds @beatPos, @onTheBreveBeat and @crossedABreveBeat)
         * @param {Object} block 
         * @param {int} getMode Toggles which values will be retrieved by resp: 
         *                      0 = all values; 1 = interpreter; 2 = user, 3 = corr
         * @memberof startTimes
         */ 
        addBreveBoundariesForBlock : function(block, getMode){
            var blockFrom = 0; // <- unused?
            var mens = block.mens;
            var events = block.events;
            var prevBeatStructure = false;
            for(var e=0; e<events.length; e++){
                var event = events[e];
                if(rm.noteOrRest(event)){
                    var tpos = durIO.readBlockFrom(event, getMode);
                    if(tpos!==false){
                        var beatStructure = durIO.setBeatPos(event, tpos, mens);
                        var minimStruct = rm.minimStructures(rm.mensurSummary(mens));
                        durIO.setBreveBoundaries(event, prevBeatStructure, beatStructure, minimStruct);
                        prevBeatStructure = beatStructure;
                    } else {
                        return;
                    }
                }
            }
        },

        /**
         * Updates block info with durations
         * @param {Array<Object>} sectionBlocks 
         * @param {int} getMode Toggles which values will be retrieved by resp: 
         *                      0 = all values; 1 = interpreter; 2 = user, 3 = corr
         * @memberof startTimes
         */
        updateBlocks : function(sectionBlocks, getMode)
        {
            // update block info
            for (let block of sectionBlocks)
            {
                let evLength = block.events.length;
                let lastEvent = block.events[evLength-1];
                let lastDur = durIO.readDur(lastEvent, getMode);
                block.dur = durIO.readBlockFrom(lastEvent, getMode) + lastDur;
                block.totaldur = durIO.readStartsAt(lastEvent, getMode) + lastDur;
            }
        },
        
        /**
         * Adds start times to blocks, e.g. after a simple analysis.
         * @param {MEIdoc} meiDoc 
         * @param {int} getMode Toggles which values will be retrieved by resp: 
         *                      0 = all values; 1 = interpreter; 2 = user, 3 = corr
         * @memberof startTimes
         */
        addStartTimes : function(meiDoc, getMode = 1) {
            var sectionBlocks = meiDoc.blocks;
            // add start times as far as possible
            this.addAllStartTimes(sectionBlocks, getMode);

            this.updateBlocks(sectionBlocks, getMode);
        }
    }
})();