/** @fileoverview Utility functions for duration I/O */
"use strict";

/** 
 * @module interpreter/utils/durIO
 * Functions for reading and writing durations for events
 */

var durIO = (function() {
    return {
        /** public */

        /**
         * Given a count of beats, writes dur.ges to an element (appends 'b'
         * and, if there's a dot of augmentation, multiplies by 1.5)
         * @param  {Integer} num Core duration in minims
         * @param {DOMElement} el mei:note
         * @param {Boolean} dot Is there a dot of augmentation?
         * @param {Number} propMultiplier proportion multiplier of current block
         */
        writeDur : function (num, el, dot, propMultiplier) {
            /*	if(dot) el.setAttributeNS(null, 'dur.ges', (1.5*num)+'b');
                    else el.setAttributeNS(null, 'dur.ges', num+'b');*/
                var scaledNum = num * propMultiplier;
                /** @todo Achtung, Funktion noch nicht vorhanden!!! */
                if(dot) {
                    // looks like num and numbase, in Verovio at least, excludes dots,
                    // and duration calculations exclude separate elemnt dots
                    //		num *= 1.5;
                    el.setAttributeNS(null, 'dots', 1);
                    el.setAttributeNS(null, 'dur.intermediate', (num*1.5)+'b');
                    el.setAttributeNS(null, 'dur.ges', (scaledNum*1.5)+'b');
                } else {
                    el.setAttributeNS(null, 'dur.ges', scaledNum+'b');
                    el.setAttributeNS(null, 'dur.intermediate', num+'b');
                }
                // This is for Verovio. Needs fixing.
                // fraction needs reduction!
                var defaultLength = rhythmMensUtils.dupleMinimCountFromElement(el);
                if(defaultLength){
                    if(Math.floor(num)!= num){
                        // FIXME: use lcd
                        num *= 12;
                        defaultLength *= 12;
                    }
                    el.setAttributeNS(null, 'num', defaultLength);
                    el.setAttributeNS(null, 'numbase', num);
                }
        },
    
        /**
         * True if e1 and e2 are notes or rests at the same mensural level
         * (e.g. minima or semibrevis)
         * @param {DOMObject} e1 mei:note or mei:rest
         * @param {DOMObject} e2 mei:note or mei:rest
         * @returns {Boolean} 
         */
        leveleq : function (e1, e2) {
            return e1.getAttributeNS(null, 'dur')===e2.getAttributeNS(null, 'dur');
        },
        
        /**
         * Write duration information for a note that we've decided should be
         * the simplest form of imperfection (subtract a third). For other
         * imperfection, use {@link writeImperfection}
         * @param {DOMElement} el mei:note
         * @param {Integer} reduceBy Time (in minims) to subtract
         * @param {DOMElement} mens mei:mensur
         * @param {String} rule Reference for rule used to decide this
         * (written to element as @rule)
         *
         */
        writeSimpleImperfection : function (el, mens, rule) {
            //	el.setAttributeNS(null, 'dur.ges', (2 * simpleMinims(el, mens) / 3) + 'b');
            this.writeDur((2 * simpleMinims(el, mens) / 3), el, false);
        //	el.setAttributeNS(null, 'num', 2);
        //	el.setAttributeNS(null, 'numbase', 3);
            el.setAttributeNS(null, 'dur.quality', 'imperfectio');
            el.setAttributeNS(null, 'quality', 'i');
            el.setAttributeNS(null, 'rule', rule);
        },
        
        /**
         * Write duration information for a note that we've decided should be
         * imperfected
         * @param {DOMElement} el mei:note
         * @param {Integer} reduceBy Time (in minims) to subtract
         * @param {DOMElement} mens mei:mensur
         * @param {String} rule Reference for rule used to decide this
         * (written to element as @rule)
         */
        writeImperfection : function (el, reduceBy, mens, rule) {
            var defaultDur = rhythmMensUtils.simpleMinims(el, mens);
            var factor = gcd(defaultDur, reduceBy);
            var finalDur = defaultDur - reduceBy
            this.writeDur(finalDur, el, false);
            //	el.setAttributeNS(null, 'num', finalDur / factor);
            //	el.setAttributeNS(null, 'numbase', defaultDur / factor);
            el.setAttributeNS(null, 'dur.quality', 'imperfectio');
            el.setAttributeNS(null, 'quality', 'i');
            el.setAttributeNS(null, 'rule', rule);	
        },
        
        /**
         * Write duration information for a note that we've decided should be
         * altered
         * @param {DOMElement} el mei:note
         * @param {DOMElement} mens mei:mensur
         * @param {String} rule Reference for rule used to decide this
         * (written to element as @rule)
         */
        writeAlteration : function (el, mens, rule) {
            //	el.setAttributeNS(null, 'dur.ges', (2 * simpleMinims(el, mens)) + 'b');
            this.writeDur((2 * rhythmMensUtils.simpleMinims(el, mens)), el, false);
        //	el.setAttributeNS(null, 'num', 2);
        //	el.setAttributeNS(null, 'numbase', 1);
            el.setAttributeNS(null, 'dur.quality', 'alteratio');
            el.setAttributeNS(null, 'quality', 'a');
            el.setAttributeNS(null, 'rule', rule);
        },
        
        /**
         * Given an event with dur.intermediate of the form [0-9]*b, return the integer
         * part
         * @param {DOMElement} mei:note or mei:rest
         * @return {Integer}
         */
        readDur : function (el) {
            var str = el.getAttributeNS(null, 'dur.intermediate');
            return str ? Number(str.substring(0, str.length-1)) : false;
        }
    
    };
})();