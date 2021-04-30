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
        var prevPartNum = sectionBlocks[0].part;
        for(var b=0; b<sectionBlocks.length; b++){
            let partNum = sectionBlocks[b].part;
            // startsAt should be resetted at the beginning of a new part
            if (prevPartNum!==partNum)
            {
                nextStart = 0;
                prevPartNum = partNum;
            }
            addStartTimesForBlock(sectionBlocks[b], nextStart);
            addBreveBoundariesForBlock(sectionBlocks[b]);
            let lastEvent = sectionBlocks[b].events[sectionBlocks[b].events.length-1];
            let lastDur = durIO.readDur(lastEvent);
            let lastStartsAt = durIO.readStartsAt(lastEvent);
            nextStart = lastStartsAt + lastDur;
        }
    }

    /**
     * More complex stages, for where knowledge is partial and patchy
     * @param {Array} sectionBlocks Array of all the coherent areas of
     * mensurations in a section
     *
     */
    function afterTheEasyBits(sectionBlocks){
        // Now we know many durations and starting points, but not all,
        // iterate through, looking for more context-dependent resolutions.
        var unresolved = 0;
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
            var events = sectionBlocks[b].events;
            var mens = sectionBlocks[b].mens;
            var menssum = rm.mensurSummary(mens);
            var alterableLevels = [2, 2, 2].concat(menssum).concat([2]); //<-- not used?
            var firstPerfect = rm.firstPerfectLevel(mens);
            for(var e=0; e<events.length; e++){
                var event = events[e];
                if(rm.isNote(event) && !durIO.readDur(event)){
                    // duration needs to be resolved
                    if(durIO.readBlockFrom(event)!==false){
                        // Most cases that are resolvable need beat numbers
                        var level = rm.noteInt(event);
                        var blockFrom = durIO.readBlockFrom(event);
                        var beatStructure = rm.beatUnitStructure(blockFrom, mens);
                        var beatOfUnit = beatStructure[level-3];
                        if(e && rm.divisionDot(events[e-1])){
                            // Division dot
                            beatOfUnit = 0;
                        }
                        if(level>firstPerfect){
                            // Potentially imperfectable
                            switch (beatOfUnit) {
                                case 0:
                                    imperfect.firstBeatImperfection(event, e, events, mens);
                                    break;
                                case 1:
                                    imperfect.secondBeatImperfection(event, e, events, mens);
                                    break;
                                case 2:
                                    imperfect.thirdBeatImperfection(event, e, events, mens);
                                    break;
                                default:
                                    imperfect.midBeatImperfection(event, e, events, mens);
                            }
                        }
                        if(!durIO.readDur(event) && rm.isAlterable(event, mens)) {
                            // Alterable? If not, why is this still here?
                            switch (beatStructure[level-2]) {
                                case 0:
                                    alterate.firstBeatAlteration(event, e, events, mens);
                                    break;
                                case 1:
                                    alterate.secondBeatAlteration(event, e, events, mens);
                                    break;
                                case 2:
                                    alterate.thirdBeatAlteration(event, e, events, mens);
                                    break;
                                default:
                                    alterate.midBeatAlteration(event, e, events, mens);
                            }
                        }
                        //
                        if(durIO.readDur(event)) {
                            // We've got a new duration, so need to update start times
                            addStartTimesForBlock(sectionBlocks[b], nextStart);
                        }
                    } else {
                        // We may be able to do *something*
                        if(rm.isNote(events[e-1]) && rm.noteInt(events[e-1])>level){
                            // An note after a longer note is likely to
                            // start on the first beat of its unit. We can put
                            // exception logic in here, but for now
                            if(level>=firstPerfect){
                                imperfect.firstBeatImperfection(event, e, events, mens);
                            } else if(menssum[level-3]===3){
                                // alterable
                                alterate.firstBeatAlteration(event, e, events, mens);
                            } else {
                                // Why are we here?
                                console.log("Warning: Found an event that isn't alterable or imperfectable:", event);
                            }
                        }
                    }
                    if(!durIO.readDur(event)) {
                        // We've got a new duration, so need to update start times
                        unresolved += 1;
                    }
                }
            }
            //if nothing within a block has been resolved, update start times
            // to make sure that preceding blocks get resolved properly
            addStartTimesForBlock(sectionBlocks[b], nextStart);
            let lastEvent = sectionBlocks[b].events[sectionBlocks[b].events.length-1];
            let lastDur = durIO.readDur(lastEvent);
            let lastStartsAt = durIO.readStartsAt(lastEvent);
            nextStart = lastStartsAt + lastDur;
            addBreveBoundariesForBlock(sectionBlocks[b]);
        }
        return unresolved;
    }

    /**
     * Add start times for all events in block for which that's possible
     * (i.e. where the start and duration of the previous note is known).
     * @param {Object} block Object with attributes for events and
     * mensuration sign
     * @param {Number} startsAtValue manually set starting position
     * @returns {Number} last starting position
     */
    function addStartTimesForBlock(block, startsAtValue){
        var blockFrom = 0;
        var mens = block.mens;
        var events = block.events;
        // this extra step can be used to do some stuff
        var startsAt = startsAtValue; 
        for(var e=0; e<events.length; e++){
            var event = events[e];
            if(rm.noteOrRest(event)){
                durIO.setStartsAt(event, blockFrom, startsAt);
                var dur = durIO.readDur(event);
                if(dur){
                    blockFrom += dur;
                    startsAt += dur;
                }
            }
        }
    }

    /**
     * Indicates where an event falls in larger-scale mensural structures,
     * also singling out which breve beat an event falls on and whether it
     * crosses one (adds @beatPos, @onTheBreveBeat and @crossedABreveBeat)
     * @param {Object} block 
     */ 
    function addBreveBoundariesForBlock(block){
        var blockFrom = 0; // <- unused?
        var mens = block.mens;
        var events = block.events;
        var prevBeatStructure = false;
        for(var e=0; e<events.length; e++){
            var event = events[e];
            if(rm.noteOrRest(event)){
                var tpos = durIO.readBlockFrom(event);
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
    }

    function updateBlocks(sectionBlocks)
    {
        // update block info
        for (let block of sectionBlocks)
        {
            let evLength = block.events.length;
            let lastEvent = block.events[evLength-1];
            let lastDur = durIO.readDur(lastEvent);
            block.dur = durIO.readBlockFrom(lastEvent) + lastDur;
            block.totaldur = durIO.readStartsAt(lastEvent) + lastDur;
        }
    }

    return {
        /** @public */

        addStartTimes : function(meiDoc) {
            var sectionBlocks = meiDoc.blocks;
            // add start times as far as possible
            addAllStartTimes(sectionBlocks);

            updateBlocks(sectionBlocks);
        },

        complexAnalysis : function(meiDoc) {
            var sectionBlocks = meiDoc.blocks;

            // run complex imperfection / alteration analysis
            var remaining = 100000000;
            var nextRemaining = afterTheEasyBits(sectionBlocks);
            while(nextRemaining != 0 && remaining!=nextRemaining){
                // Rerun this for as long as it makes a difference
                // (i.e. resolves unsolved durations/start times)
                console.log("unresolved count", remaining, nextRemaining);
                remaining=nextRemaining;
                nextRemaining = afterTheEasyBits(sectionBlocks);
            }

            durIO.setDurGesPerBlock(sectionBlocks);

            updateBlocks(sectionBlocks);

            console.log(remaining);
        }
    }
})();