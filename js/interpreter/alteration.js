"use strict";

/**
 * @module interpreter/alterate
 */

var alterate = (function() {
    /** private */

    /**
     * Check an event for evidence of alteration. Alters event if it falls
     * after a longer note followed by its own duration. Where there is
     * uncertainty about the intervening duration, rule out alteration if
     * the minimum interpretation of that duration is too long. We assume
     * that the calling function has established that the ensuing durations 
     * are suitable.
     * @param {DOMObject} event mei:note (rests can't be altered)
     * @param {Integer} index The note's position in events
     * @param {Array} events Sequence of events in this section for this voice 
     * @param {DOMObject} mens mei:mensur
     * @returns {DOMObject} This function returns the altered event (why?) 
     */
    function checkForGeneralAlteration(event, index, events, mens){
        var level = rm.noteInt(event);
        var starts = indexOfPrevLongerOrDot(level, index, events);
        var leftWindow = events.slice(starts+1, index);
        var durations = durIO.windowDuration(leftWindow, mens);
        //	var defaultLength = proportionMultiplier(event) * simpleMinims(event, mens);
        var defaultLength = rm.simpleMinims(event, mens);
        if(durations.definite || durations.bareMinimum == 0){
            if(durations.definite==defaultLength){
                durIO.writeAlteration(event, mens, 'A.2');
            } else {
                if(event.getAttributeNS(null, 'mensurBlockStartsAt')==="20") console.log("x", leftWindow, durations);
                event.setAttributeNS(null, 'rule', 'A.xxx');
    //			event.setAttributeNS(null, 'dur.ges', simpleMinims(event, mens)+'b');
                durIO.writeDur(rm.simpleMinims(event, mens), event, false);
            }
        } else if(durations.bareMinimum > defaultLength){
            // not altered
            if(event.getAttributeNS(null, 'mensurBlockStartsAt')==="20") console.log("z", durations);
            event.setAttributeNS(null, 'rule', 'A.xxz');
    //		event.setAttributeNS(null, 'dur.ges', simpleMinims(event, mens)+'b');			
            durIO.writeDur(rm.simpleMinims(event, mens), event, false);
        }
        return event;
    }

    return {
        /** public */

        /**
         * Given an event on the first beat, if we can tell if it's altered,
         * label the duration. 
         * @param {DOMObject} event mei:note (rest would have been resolved already)
         * @param {Integer} index The note's position in events
         * @param {Array} events Sequence of events in this section for this voice 
         * @param {DOMObject} mens mei:mensur
         * @returns {DOMObject} This function returns the modified event (why?)
         */
        firstBeatAlteration : (event, index, events, mens) => {
            return checkForGeneralAlteration(event, index, events, mens);
        },

        /**
         * Given an event on the second beat, if we can tell if it's altered,
         * label the duration. Currently, absolutely assumes alteration is appropriate.
         * @param {DOMObject} event mei:note (rest would have been resolved already)
         * @param {Integer} index The note's position in events
         * @param {Array} events Sequence of events in this section for this voice 
         * @param {DOMObject} mens mei:mensur
         * @returns {DOMObject} This function returns the modified event (why?)
         */
        secondBeatAlteration : (event, index, events, mens) => {
            // second beat is special...
            event.setAttributeNS(null, 'rule', 'A.1');
            event.setAttributeNS(null, 'quality', 'a');
            durIO.writeDur(2*rm.simpleMinims(event, mens), event, false);
        //	event.setAttributeNS(null, 'dur.ges', simpleMinims(event, mens)*2+'b');
            return event;
        },

        /**
         * Given an event on the third beat, if we can tell if it's altered,
         * label the duration.
         * @param {DOMObject} event mei:note (rest would have been resolved already)
         * @param {Integer} index The note's position in events
         * @param {Array} events Sequence of events in this section for this voice 
         * @param {DOMObject} mens mei:mensur
         * @returns {DOMObject} This function returns the modified event (why?)
         */
        thirdBeatAlteration : (event, index, events, mens) => {
            return checkForGeneralAlteration(event, index, events, mens);
        },


        /**
         * Currently a placeholder for deciding the alteration status of a
         * note that isn't on beats 1, 2 or 3
         * @param {DOMObject} event mei:note (rest would have been resolved already)
         * @param {Integer} index The note's position in events
         * @param {Array} events Sequence of events in this section for this voice 
         * @param {DOMObject} mens mei:mensur
         * @returns {DOMObject} This function returns the altered event (why?)
         * @returns {DOMObject} Returns the event (unmodified at the moment)
         */
        midBeatAlteration : (event, index, events, mens) => {
            return event;
        }
    }
})();