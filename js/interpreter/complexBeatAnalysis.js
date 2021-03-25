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
        var levels = rm.minimStructures(rm.mensurSummary(mens));
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
        var minims = rm.minimStructures(rm.mensurSummary(mens));
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
        for(var b=0; b<sectionBlocks.length; b++){
            var events = sectionBlocks[b].events;
            var mens = sectionBlocks[b].mens;
            var menssum = rm.mensurSummary(mens);
            var alterableLevels = [2, 2, 2].concat(menssum).concat([2]); //<-- not used?
            var firstPerfect = rm.firstPerfectLevel(mens);
            for(var e=0; e<events.length; e++){
                var event = events[e];
                if(event.tagName==='note' && !event.getAttributeNS(null, 'dur.ges')){
                    // duration needs to be resolved
                    if(event.getAttributeNS(null, 'mensurBlockStartsAt')){
                        // Most cases that are resolvable need beat numbers
                        var level = rm.noteInt(event);
                        var blockFrom = Number(event.getAttributeNS(null, 'mensurBlockStartsAt'));
                        var beatStructure = beatUnitStructure(blockFrom, mens);
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
                        if(!event.getAttributeNS(null, 'dur.ges') && rm.isAlterable(event, mens)) {
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
                        if(event.getAttributeNS(null, 'dur.ges')) {
                            // We've got a new duration, so need to update start times
                            addStartTimesForBlock(sectionBlocks[b]);
                        }
                    } else {
                        // We may be able to do *something*
                        if(events[e-1].tagname==='note' && rm.noteInt(events[e-1])>level){
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
                    if(!event.getAttributeNS(null, 'dur.ges')) {
                        // We've got a new duration, so need to update start times
                        unresolved += 1;
                    }
                }
            }
            addBreveBoundariesForBlock(sectionBlocks[b]);
        }
        return unresolved;
    }

    /**
     * Add start times for all events in block for which that's possible
     * (i.e. where the start and duration of the previous note is known).
     * @param {Object} block Object with attributes for events and
     * mensuration sign
     */
    function addStartTimesForBlock(block){
        var blockFrom = 0;
        var mens = block.mens;
        var events = block.events;
        for(var e=0; e<events.length; e++){
            var event = events[e];
            if(event.tagName==='rest' || event.tagName==='note'){
                event.setAttributeNS(null, 'mensurBlockStartsAt', blockFrom);
                var dur = durIO.readDur(event);
                if(dur){
                    blockFrom += dur;
                } else return;
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
                var tpos = event.getAttributeNS(null, 'mensurBlockStartsAt');
                if(tpos){
                    var beatStructure = beatUnitStructure(tpos, mens);
                    event.setAttributeNS(null, 'beatPos', beatStructure.join(', '));
                    if(beatStructure[0]===0 && beatStructure[1]===0 && beatStructure[2]===0){
                        event.setAttributeNS(null, 'onTheBreveBeat', beatStructure[3]);
                    } else if(!(beatStructure[5]===prevBeatStructure[5]
                                            && beatStructure[4]===prevBeatStructure[4]
                                            && beatStructure[3]===prevBeatStructure[3])){
                        event.setAttributeNS(null, 'crossedABreveBeat', breveDifference(beatStructure, prevBeatStructure, mens));
                    }
                    prevBeatStructure = beatStructure;
                } else {
                    return;
                }
            }
        }
    }


    return {
        /** @public */
        complexAnalysis : (meiDoc) => {
            var sectionBlocks = meiDoc.blocks;

            // add start times as far as possible
            addAllStartTimes(sectionBlocks);

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
            console.log(remaining);
        }
    }
})();