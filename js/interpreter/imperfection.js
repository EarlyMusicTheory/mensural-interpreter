/** @fileoverview Check imperfection rules */
"use strict";

/**
 * @namespace imperfect
 * @desc Check imperfection rules
 */
var imperfect = (function() {
    /** private */

    /**
     * Having sifted the trivial cases out, attempts to resolve cases that
     * rely on context, particularly the shorter notes that follow this one.
     * @param {DOMObject} event mei:note (rest would have been resolved already)
     * @param {Array} window List of following events (until the next
     * division dot or equivalent, or the next event of similar or greater
     * length).
     * @param {DOMObject} mens mei:mensur
     * @returns {DOMObject} This function returns the modified event (why?)
     * @memberof imperfect
     * @inner
     */
    function firstBeatImperfectionCheck(event, window, mens){
        var level = rm.noteInt(event);
        var duration = durIO.windowDuration(window, mens);
    //	if(level==5) console.log(event, duration);
        var imperfectionPossibilities = imperfectingLevels(event, mens);
    //	console.log(imperfectionPossibilities);
        if(duration.definite){
            while(imperfectionPossibilities.length){
                var nextToTry = imperfectionPossibilities.pop();
                var imperfectingUnits = duration.definite / nextToTry;
                if(imperfectingUnits===1){
                    durIO.writeImperfection(event, nextToTry, mens, 'I.4a');
                    return true;
                } else if (imperfectingUnits===2){
                    if(rm.isAlterable(window[window.length-1], mens)){
                        durIO.writePerfection(event, mens, 'I.5');
                        //event.setAttributeNS(null, 'rule', 'I.5');
                        //event.setAttributeNS(null, 'quality', 'p');
                        //event.setAttributeNS(null, 'dur.ges', simpleMinims(event, mens)+'b');
                        //durIO.writeDur(rm.simpleMinims(event, mens), event, false);
                        ioHandler.writeComment(event, 'trusting in alteration');
                    } else {
                        durIO.writeImperfection(event, nextToTry, mens, 'I.5-add');
                        ioHandler.writeComment(event, 'Alteration is impossible');
                    }
                    ///WTF!!!!!?!
                    return false;
                } else if (imperfectingUnits===3 || imperfectingUnits===6 || imperfectingUnits===9){
                    durIO.writePerfection(event, mens, 'I.6');
                    //event.setAttributeNS(null, 'rule', 'I.6');
                    //event.setAttributeNS(null, 'quality', 'p');
                    //event.setAttributeNS(null, 'dur.ges', simpleMinims(event, mens)+'b');
                    //durIO.writeDur(rm.simpleMinims(event, mens), event, false);
                    return false;
                } else if (imperfectingUnits>3){
                    durIO.writeImperfection(event, nextToTry, mens, 'I.4b');
                    return true;
                }
            }
        } else if (solidBlock(duration.approximation, imperfectionPossibilities)){
            // Obvious blocks of perfect units aren't going to be altered
            durIO.writePerfection(event, mens, 'I.5-literalunits', true);
            //event.setAttributeNS(null, 'rule', 'I.5-literalunits');
            //event.setAttributeNS(null, 'quality', 'p');
            //event.setAttributeNS(null, 'defaultminims', rm.simpleMinims(event, mens));
            //durIO.writeDur(rm.simpleMinims(event, mens), event);
            return true;
        } else if(duration.approximation/rm.simpleMinims(event, mens, -1) === 2 && rm.mensurSummary(mens)[level-4]===3
                            && rm.noteInt(window[window.length-1])===level-1 && rm.isAlterable(window[window.length-1], mens)){
            // This is a window with the equivalent of two units, one of which is alterable
            // The last note of the window will be altered
            durIO.writePerfection(event, mens, 'I.6-literalunits', true);
            //event.setAttributeNS(null, 'rule', 'I.6-literalunits');
            //event.setAttributeNS(null, 'quality', 'p');
            //event.setAttributeNS(null, 'defaultminims', rm.simpleMinims(event, mens));
            //durIO.writeDur(rm.simpleMinims(event, mens), event);
            ioHandler.writeComment(event, 'trusting in alteration');		
        } else if(duration.bareMinimum > 3 * imperfectionPossibilities[imperfectionPossibilities.length-1]){
            var imperfector = imperfectionPossibilities[imperfectionPossibilities.length-1];
            durIO.writeImperfection(event, imperfector, mens, 'I.4bi', true);
            //event.setAttributeNS(null, 'defaultminims', rm.simpleMinims(event, mens));
            //event.setAttributeNS(null, 'imperfectedBy', imperfector);
            return true;		
        } else if(duration.approximateMinimum > 3 * imperfectionPossibilities[imperfectionPossibilities.length-1]){
            var imperfector = imperfectionPossibilities[imperfectionPossibilities.length-1];
            durIO.writeImperfection(event, imperfector, mens, 'I.4bii', false);
            //event.setAttributeNS(null, 'defaultminims', rm.simpleMinims(event, mens));
            //event.setAttributeNS(null, 'imperfectedBy', imperfector);
            return true;		
        } else {
            console.log('failed to resolve', event, mens, duration);
        }
    }

    /**
     * Forward window support – find the next note that's at least as
     * long, or find a dot of division
     * @param {integer} level Level of the note
     * @param {integer} index Index of the current event (start point for the search)
     * @param {Array} seq Array of events
     * @return {(integer|boolean)} Position if found (false if not)
     * @memberof imperfect
     * @inner
     */
    function indexOfNextSameOrLongerOrDot(level, index, seq){
        for(var i=index+1; i<seq.length; i++){
            if((seq[i].tagName==='dot' && seq[i].getAttributeNS(null, 'form')!=='aug')
                || (rm.noteInt(seq[i])>=level)){
                return i;
            }
        }
        return false;
    }

    /**
     * True if the level in the first argument can imperfect the level in
     * the second, given the prevailing mensuration.
     * @param {Integer} shortLevel Level (semifusa=0, fusa=1,...maxima=7) of shorter note
     * @param {Integer} longLevel Level (semifusa=0, fusa=1,...maxima=7) of longer note
     * @param {Array} menssum Summary of mensuration (as returned by {@link mensurSummary}
     * @returns {Boolean} 
     * @memberof imperfect
     * @inner
     */
    function canImperfect(shortLevel, longLevel, menssum){
        // can something at shortlevel imperfect a note at longlevel, given
        // mensum?
        
        // FIXME assumes statement in imperfectingLevels comment is correct
        // (and I'm not sure it is)
        for(var i=shortLevel-3; i<longLevel-3; i++){
            if(menssum[i]===3) return true;
        }
        return false;
    }

    /**
     * Returns the minim counts for all levels that can imperfect element
     * @param {DOMObject} element
     * @param {DOMObject} mensur
     * @returns {Array} 
     * @memberof imperfect
     * @inner
     */
    function imperfectingLevels(element, mensur){
        // A note can be imperfected by any value that is less than the note's
        // highest perfect component
        var mensum = rm.mensurSummary(mensur);
        var elLevel = rm.noteInt(element) - 4;
        var perf = false;
        for(var i=elLevel; i>=0; i--){
            if(mensum[i]===3) {
                perf = i;
                break;
            }
        }
        //console.log(mensum, elLevel, perf, minimStructures(mensum));
        if(perf || perf===0){
            var possibilities = [1].concat(rm.minimStructures(mensum, perf));
            return possibilities;
        }
        return [];
    }

    /**
     * Often, rests are grouped vertically to indicate coherent mensural
     * units – in effect, the vertical displacement acting as a dot of
     * division. check whether two (implicitly adjacent) rests behave like
     * that.
     * @param {Integer} maxLevel Highest mensural level that we're
     * interested in (expressed as 0=semifusa, 1=fusa, etc.)
     * @param {DOMObject} rest1 mei:rest
     * @param {DOMObject} rest2 mei:rest
     * @param {String} direction "left" | "right"
     * @returns {Boolean} 
     * @memberof imperfect
     * @inner
     */
    function divisionLikeRests(maxLevel, rest1, rest2, direction){
        return ((!direction && rm.noteInt(rest1)<maxLevel && rm.noteInt(rest2)<maxLevel)
                        || (direction==="left" && rm.noteInt(rest1)<maxLevel)
                        || (direction==="right" && rm.noteInt(rest2)<maxLevel))
            && rest1.tagName==='rest' && rest2.tagName==='rest'
            && rest1.getAttributeNS(null, 'loc') !== rest2.getAttributeNS(null, 'loc');
    }

    /**
     * Forward window support – find the next dot of division
     * @param {Integer} index Index of the current event (start point for the seach
     * @param {Array} seq Array of events
     * @return {Integer} Position if found (false if not)
     * @memberof imperfect
     * @inner
     */
    function indexOfNextDot(index, seq){
        for(var i=index+1; i<seq.length; i++){
            if(seq[i].tagName==='dot' && seq[i].getAttributeNS(null, 'form')!=='aug'){
                return i;
            }
        }
        return false;
    }

    /**
     * Returns true if a duration (in minims) is 3, 6 or 9 times the
     * length of any of a list of candidate values, otherwise returns
     * false. This is for durations of windows of notes, to see whether
     * they represent a coherent block of whole mensural units (which is
     * likely to imply that they fall on the beat and that they don't
     * imperfect their neighbours).
     * @param {Integer} minimCount
     * @param {Array} possibleDivisors
     * @returns {} 
     * @memberof imperfect
     * @inner
     */
    function solidBlock(minimCount, possibleDivisors){
        // If a block of notes looks like it is made up of a small number of
        // whole, coherent mensural units, it probably is. Given its
        // notational length, check for 3, 6, or 9 of the possible perfect
        // units.
        if(minimCount % 3 !== 0) return false;
        for(var i=possibleDivisors.length-1; i>=0; i--){
            var units = minimCount / possibleDivisors[i];
            if(units == 3 || units==6 || units==9){
                return possibleDivisors[i];
            }
        }
        return false;
    }


    return{
        /** public */

        /**
         * Given an event on the first beat, if we can tell if it's perfect,
         * label the duration. Checks simpler rules (I.3 and I.4 from the
         * rulelist). If the note remains unresolved, calls {@link
         * firstBeatAlterationCheck} with a context window of events that
         * might affect the decision.
         * @param {DOMObject} event mei:note (rest would have been resolved already)
         * @param {Integer} index The note's position in events
         * @param {Array} events Sequence of events in this section for this voice 
         * @param {DOMObject} mens mei:mensur
         * @returns {DOMObject} This function returns the modified event (why?)
         * @memberof imperfect
         */
        firstBeatImperfection : function (event, index, events, mens) {
            var level = rm.noteInt(event);
            var nextMarker = indexOfNextSameOrLongerOrDot(level, index, events);
            var rightWindow = nextMarker ? events.slice(index+1, nextMarker) : events.slice(index+1);
            var menssum = rm.mensurSummary(mens);
            if(rightWindow.length==0){
                // I.3 => perfect
                durIO.writePerfection(event, mens, 'I.3');
                //durIO.writeDur(rm.simpleMinims(event, mens), event);
                //event.setAttributeNS(null, 'quality', 'p');
                //event.setAttributeNS(null, 'rule', 'I.3-726');
                return event;
            } else if (index<events.length-2
                                 && (rm.divisionDot(events[index+2])
                                         || (rm.noteOrRest(events[index+2]) && rm.noteInt(events[index+2])>=level))
                                 && rm.noteOrRest(events[index+1]) && canImperfect(rm.noteInt(events[index+1]), level, menssum)){
                // I.4 a) - a simplified case where there's an obvious
                // single note
                durIO.writeSimpleImperfection(event, mens, 'I.4a');
                return event;
            } else if (((index<events.length-3 && (rm.divisionDot(events[index+3]) 
                                || divisionLikeRests(rm.firstPerfectLevel(mens)+1, events[index+2], events[index+3], "left")))
                            || index==events.length-3)
                        && rm.noteInt(events[index+1]) == rm.noteInt(events[index+2])
                        && canImperfect(rm.noteInt(events[index+1]), level, menssum)) {
                // very special case (generalise this later)
                durIO.writeImperfection(event, 2*rm.simpleMinims(events[index+1], mens), mens, 'I.4a');
                return true;
        
            } else {
                return firstBeatImperfectionCheck(event, rightWindow, mens);
            }
        },
        
        /**
         * Given an event on the second beat, if we can tell if it's perfect,
         * label the duration. Checks rule I.8 from the rulelist
         * @param {DOMObject} event mei:note (rest would have been resolved already)
         * @param {Integer} index The note's position in events
         * @param {Array} events Sequence of events in this section for this voice 
         * @param {DOMObject} mens mei:mensur
         * @returns {DOMObject} This function returns the modified event (why?)
         * @memberof imperfect
         */
        secondBeatImperfection : function (event, index, events, mens) {
            // Let's pretend this is easy, and apply I.8 as if we *knew* that
            // something earlier can imperfect this
            durIO.writeSimpleImperfection(event, mens, 'I.8');
            return event;	
        },
        
        /**
         * Given an event on the third beat, if we can tell if it's perfect,
         * label the duration. Checks rule I.9 from the rulelist
         * @param {DOMObject} event mei:note (rest would have been resolved already)
         * @param {Integer} index The note's position in events
         * @param {Array} events Sequence of events in this section for this voice 
         * @param {DOMObject} mens mei:mensur
         * @returns {DOMObject} This function returns the modified event (why?)
         * @memberof imperfect
         */
        thirdBeatImperfection : function (event, index, events, mens) {
            // More complex
            var imperfectionPossibilities = imperfectingLevels(event, mens);
            var nextDotPos = indexOfNextDot(index, events);
            // Simplest imperfection
            if(nextDotPos && nextDotPos - index < 6 
                && imperfectionPossibilities.indexOf(durIO.windowDuration(events.slice(index+1, nextDotPos), mens).approximation)>-1)
            {
                // There's a simple explanation, that is imperfection from behind
                durIO.writeImperfection(event, durIO.windowDuration(events.slice(index+1, nextDotPos), mens).approximation,
                                                    mens, 'I.9b');
            } 
            else 
            {
                // imperfection from ahead (by how much?)
                durIO.writeImperfection(event, imperfectionPossibilities[imperfectionPossibilities.length-1],
                                                    mens, 'I.9a');
            }
            return event;
        },
        
        /**
         * Currently a placeholder for deciding the imperfection status of a
         * note that isn't on beats 1, 2 or 3
         * @param {DOMObject} event mei:note (rest would have been resolved already)
         * @param {Integer} index The note's position in events
         * @param {Array} events Sequence of events in this section for this voice 
         * @param {DOMObject} mens mei:mensur
         * @returns {DOMObject} This function returns the altered event (why?)
         * @returns {DOMObject} Returns the event (unmodified at the moment)
         * @memberof imperfect
         */
        midBeatImperfection : function (event, index, events, mens) {
            // More complex
            return event;
        }
    }
})();