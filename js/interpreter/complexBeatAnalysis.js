/** @fileoverview  */
"use strict";

/** @module interpreter/complexBeats */

var complexBeats = (function() {

    /**
     * @summary If event[n] has both a duration assigned to it and a start time,
     * adds a start time for event[n+1]
     * @param {Array} sectionBlocks Array of all the coherent areas of
     * mensurations in a section
     */
    function addAllStartTimes(sectionBlocks){
        var nextStart = 0;
        var prevDur = false;
        var prevBeatStructure = false;
        for(var b=0; b<sectionBlocks.length; b++){
            var blockFrom = 0;
            // not used anyway var blockStart = (nextStart || nextStart===0) ? nextStart : false;
            var mens = sectionBlocks[b].mens;
            for(var e=0; e<sectionBlocks[b].events.length; e++){
                var event = sectionBlocks[b].events[e];
                if(event.tagName==='rest' || event.tagName==='note'){
                    if(nextStart || nextStart===0) event.setAttributeNS(null, 'startsAt', nextStart);
                    var beatStructure = beatUnitStructure(blockFrom, mens);
                    event.setAttributeNS(null, 'beatPos', beatStructure.join(', '));
                    if(beatStructure[0]===0 && beatStructure[1]===0 && beatStructure[2]===0){
                        event.setAttributeNS(null, 'onTheBreveBeat', beatStructure[3]);
                    } else if(!(beatStructure[5]===prevBeatStructure[5]
                                            && beatStructure[4]===prevBeatStructure[4]
                                            && beatStructure[3]===prevBeatStructure[3])){
                        event.setAttributeNS(null, 'crossedABreveBeat', breveDifference(beatStructure, prevBeatStructure, mens));
                    }
                    prevBeatStructure = beatStructure;
                    event.setAttributeNS(null, 'mensurBlockStartsAt', blockFrom);
                    var dur = durIO.readDur(event);
                    if(dur){
                        prevDur = dur;
                        if(nextStart || nextStart==0) nextStart +=prevDur;
                        blockFrom += prevDur;
                    } else break;
                }
            }
        }
    }

    /**
     * Return an array of an event's position with respect to all mensural
     * levels.
     * @param {Number} startMinims Minim steps since the start of the
     * counting period
     * @parm {DOMObject} mens mei:mensur
     */
    function beatUnitStructure(startMinims, mens){
        var rem = startMinims;
        var levels = rhythmMensUtils.minimStructures(rhythmMensUtils.mensurSummary(mens));
        var units = [0, 0, 0, 0, 0, 0];
        var leveln = levels.length
        for(var i=0; i<leveln; i++){
            var minims = levels[leveln-1-i];
            var beats = Math.floor(rem / minims);
            rem = rem % minims;
            units[5-i] = beats;
        }
        units[1] = Math.floor(rem);
        units[0] = rem%1;
        return units;
    }

    /**
     * Calculate the number of breves between two times, specified as
     * the number of mensural units into the current section (so [subminims,
     * minims, semibreves, breves, longs, maximas])
     * @param {Array} struct2 Timepoint
     * @param {Array} struct2 Timepoint
     * @param {DOMObject} mens mei:mens element
     * @return {Number} Number of breve beats separating the notes
     */
    function breveDifference(struct2, struct1, mens){
        var minims = rhythmMensUtils.minimStructures(rhythmMensUtils.mensurSummary(mens));
        // var breves = 0; <-- not used anyway
        // var minims = 0; <-- makes no sense, it's already there
        var MiB = minims[3];
        for(var i=3; i<struct2.length; i++){
            if(struct1[i]>struct2[i]){
                minims += minims[i]*(struct1[i] - struct2[i]) - minims[i+1];
            } else if (struct2[i]>struct1[i]){
                minims += minims[i]*(struct2[i] - struct1[i]);
            }
        }
        return minims/MiB;
    }

    return {
        /** 
         * @todo add function to call complex analysis
         * --> addAllStartTimes() and afterTheEasyBits()
         */

        /** @public */
        complexAnalysis : (meiDoc) => {
            var sectionBlocks = meiDoc.blocks;
            addAllStartTimes(sectionBlocks);
        }
    }
})();