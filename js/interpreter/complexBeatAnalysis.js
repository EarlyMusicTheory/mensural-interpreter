/** @fileoverview  */
"use strict";

/** 
 * @namespace complexBeats
 * @desc Functionality to add start times and run analysis depending on beat positions
*/

var complexBeats = (function() {

    /**
     * More complex stages, for where knowledge is partial and patchy
     * @param {Array} sectionBlocks Array of all the coherent areas of
     * mensurations in a section
     * @memberof complexBeats
     * @inner
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
                            startTimes.addStartTimesForBlock(sectionBlocks[b], nextStart);
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
            startTimes.addStartTimesForBlock(sectionBlocks[b], nextStart);
            startTimes.addBreveBoundariesForBlock(sectionBlocks[b]);
            let lastEvent = sectionBlocks[b].events[sectionBlocks[b].events.length-1];
            let lastDur = durIO.readDur(lastEvent);
            let lastStartsAt = durIO.readStartsAt(lastEvent);
            nextStart = lastStartsAt + lastDur;
        }
        return unresolved;
    }

    return {
        /**
         * Runs complex analysis depending of beat positions
         * @param {MEIdoc} meiDoc  
         * @memberof complexBeats
         */
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

            //durIO.setDurGesPerBlock(sectionBlocks);

            startTimes.updateBlocks(sectionBlocks);

            console.log(remaining);
        }
    }
})();