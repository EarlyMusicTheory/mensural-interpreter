/** @fileoverview Utility functions for duration I/O */
"use strict";

/** 
 * @namespace durIO
 * @desc Functions for reading and writing durations for events, encapsules custom MEI ouput
 */

var durIO = (function() {
    /** private */
    /**
     * Find highest common factor (for tidy @num/@numbase use). May be
     * less useful, depending how these attributes actually work.
     * @param {Integer} a
     * @param {Integer} b
     * @return {Integer}
     * @memberof durIO
     * @inner
     */
    function gcd(a,b) {
        // Find the highest common factor (for tidy num/numbase values)
        // This is recursive, so prob unwise in the general case, but fine here
        // Taken from rosettaCode
        return b ? gcd(b, a % b) : Math.abs(a);
    }

    /**
     * Calculate the number of breves between two times, specified as
     * the number of mensural units into the current section (so [subminims,
     * minims, semibreves, breves, longs, maximas])
     * @param {Array} struct2 Timepoint
     * @param {Array} struct2 Timepoint
     * @param {Array} minimStruct beat structure in minims
     * @return {Number} Number of breve beats separating the notes
     * @memberof durIO
     * @inner
     */
    function breveDifference(struct2, struct1, minimStruct){
        // var breves = 0; <-- not used anyway
        var minims = 0;
        var MiB = minimStruct[1];
        for(var i=3; i<struct2.length; i++)
        {
            if(struct1[i]>struct2[i])
            {
                minims += minimStruct[i-2]*(struct1[i] - struct2[i]) - minimStruct[i-1];
            } 
            else if (struct2[i]>struct1[i])
            {
                minims += minimStruct[i-2]*(struct2[i] - struct1[i]);
            }
        }
        return minims/MiB;
    }

    return {
        /** public */

        /**
         * Given a count of beats, writes dur.itermediate to an element
         * @param  {Integer} num Core duration in minims
         * @param {DOMElement} el mei:note
         * @memberof durIO
         */
        writeDur : function (num, el) {
            // remove dot functionality to handle it elsewhere
            /*if(dot) {
                num = num*1.5;
            }*/
            el.setAttributeNS(null, 'dur.intermediate', num+'b');
        },

        /**
         * Given an element with dur.intermediate, writes dur.ges to an element,
         * applying the proportion multiplier.
         * @param {DOMElement} el 
         * @param {Number} propMultiplier 
         * @memberof durIO
         */
        writeDurGes : function (el, propMultiplier) {
            var dur = this.readDur(el);
            var scaledDur = dur * propMultiplier;
            if(dur)
            {
                el.setAttributeNS(null, "dur.ges", scaledDur + 'b');
            }
        },
        
        /**
         * Writes duration and a rule, modifications can be set if necessary,
         * e.g. for ante sim
         * @param {DOMElement} el 
         * @param {DOMElement} mens
         * @param {string} rule 
         * @param {Boolean} dot is there a dot of augmentation? default false
         * @param {Number} modNum numerator of duration modifier
         * @param {Number} modDenom denominator of duration modifier
         * @memberof durIO
         */
        writeDurWithRule : function (el, mens, rule, dot = false, modNum = 1, modDenom = 1) {
            if(dot)
            {
                modNum = modNum * 3;
                modDenom = modDenom * 2;
                let factor = gcd(modNum, modDenom);
                modNum = modNum / factor;
                modDenom = modDenom / factor;
            }
            
            let modifier = modNum / modDenom;
            this.writeDur(rm.simpleMinims(el, mens) * modifier, el);
            el.setAttributeNS(null, 'rule', rule);
            if (modNum !== 1 || modDenom !== 1)
            {
                el.setAttributeNS(null, 'num', modDenom);
				el.setAttributeNS(null, 'numbase', modNum);
            }
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
         * @memberof durIO
         *
         */
        writeSimpleImperfection : function (el, mens, rule) {
            //	el.setAttributeNS(null, 'dur.ges', (2 * simpleMinims(el, mens) / 3) + 'b');
            this.writeDur((2 * rm.simpleMinims(el, mens) / 3), el);
            el.setAttributeNS(null, 'num', "3");
            el.setAttributeNS(null, 'numbase', "2");
            el.setAttributeNS(null, 'dur.quality', 'imperfecta');
            //el.setAttributeNS(null, 'quality', 'i');
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
         * @param {Boolean} defaultMinims add default minims?
         * @memberof durIO
         */
        writeImperfection : function (el, reduceBy, mens, rule, defaultMinims = false) {
            var defaultDur = rm.simpleMinims(el, mens);
            var factor = gcd(defaultDur, reduceBy);
            var finalDur = defaultDur - reduceBy;
            this.writeDur(finalDur, el);
            el.setAttributeNS(null, 'num', finalDur / factor);
            el.setAttributeNS(null, 'numbase', defaultDur / factor);
            el.setAttributeNS(null, 'dur.quality', 'imperfecta');
            el.setAttributeNS(null, 'rule', rule);	
            if (defaultMinims === true)
            {
                el.setAttributeNS(null, 'defaultminims', rm.simpleMinims(el, mens));
            }
        },
        
        /**
         * Write duration information for a note that we've decided should be
         * altered
         * @param {DOMElement} el mei:note
         * @param {DOMElement} mens mei:mensur
         * @param {String} rule Reference for rule used to decide this
         * (written to element as @rule)
         * @memberof durIO
         */
        writeAlteration : function (el, mens, rule) {
            //	el.setAttributeNS(null, 'dur.ges', (2 * simpleMinims(el, mens)) + 'b');
            this.writeDur((2 * rm.simpleMinims(el, mens)), el);
            el.setAttributeNS(null, 'num', "1");
            el.setAttributeNS(null, 'numbase', "2");
            el.setAttributeNS(null, 'dur.quality', 'altera');
            //el.setAttributeNS(null, 'quality', 'a');
            el.setAttributeNS(null, 'rule', rule);
        },

        /**
         * Writes perfection, 
         * (if note is regularly perfect, no num/numbase will be added, somehiw Verovio needs it anyway)
         * @param {DOMElement} el 
         * @param {DOMElement} mens 
         * @param {String} rule 
         * @param {Boolean} defaultMinims
         * @memberof durIO
         */
        writePerfection : function (el, mens, rule, defaultMinims = false) {
            durIO.writeDur(rm.simpleMinims(el, mens), el);
            el.setAttributeNS(null, 'dur.quality', 'perfecta');
            // it doesn't make sense, but maybe Verovio needs it...
            //if(!rm.regularlyPerfect(el, mens))
            //{
                el.setAttributeNS(null, 'num', '2');
                el.setAttributeNS(null, 'numbase', '3');
            //}
            if (defaultMinims === true)
            {
                el.setAttributeNS(null, 'defaultminims', rm.simpleMinims(el, mens));
            }
            el.setAttributeNS(null, 'rule', rule);
        },
        
        /**
         * Given an event with dur.intermediate of the form [0-9]*b, return the integer
         * part
         * @param {DOMElement} mei:note or mei:rest
         * @return {Integer}
         * @memberof durIO
         */
        readDur : function (el) {
            var str = el ? el.getAttributeNS(null, 'dur.intermediate') : null;
            return str ? Number(str.substring(0, str.length-1)) : false;
        },

        /**
         * Given an event with dur.ges of the form [0-9]*b, return the integer
         * part
         * @param {DOMElement} el 
         * @returns {Number}
         * @memberof durIO
         */
        readDurGes : function (el) {
            var str = el ? el.getAttributeNS(null, 'dur.ges') : null;
            return str ? Number(str.substring(0, str.length-1)) : false;
        },

        /**
         * Get exact, estimated and minimum durations for a window, naively
         * calculated. The returned object has attibutes for definite,
         * bareMinimum (including possible extremes of imperfection),
         * approximateMinimum (less extreme) and approximation ('most likely')
         * @param {Array<DOMElement>} events
         * @param {DOMElement} mens
         * @returns {Object}
         * @memberof durIO
         */
         windowDuration : function (events, mens) {
            var duration = {definite: 0, bareMinimum: 0, approximateMinimum: 0, approximation: 0};
            var definite = true;
            for(var i=0; i<events.length; i++){
                var event = events[i];
                if(rm.noteOrRest(event)){
                    if(this.readDur(event)) {
                        var dur = this.readDur(event);
                        if(definite) duration.definite += dur;
                        duration.bareMinimum += dur;
                        duration.approximateMinimum += dur;
                        duration.approximation += dur;
                    } else {
                        definite = false;
                        duration.definite = false;
                        var mins = rm.simpleMinims(event, mens);
                        duration.approximateMinimum += mins / 3;
                        duration.approximation += mins;
                    }
                }
            }
            return duration;
        },

        /**
         * Writes a @comment during interpretation to an element
         * @param {DOMElement} el 
         * @param {String} comment 
         * @memberof durIO
         */
        writeComment : function (el, comment) {
            el.setAttributeNS(null, 'comment', comment);
        },
        
        /**
         * Sets the starting position of an event for a block (mensurBlockStartsAt) 
         * and the whole part (startsAt)
         * @param {DOMElement} el 
         * @param {Number} blockFrom start of event in block
         * @param {Number} startsAt start of event per part
         * @memberof durIO
         */
        setStartsAt : function (el, blockFrom, startsAt) {
            el.setAttributeNS(null, 'mensurBlockStartsAt', blockFrom);
            el.setAttributeNS(null, 'startsAt', startsAt);
        },

        /**
         * Reads startsAt attribute from element
         * @param {DOMElement} el 
         * @returns {Number}
         * @memberof durIO
         */
        readStartsAt : function (el) {
            var startsAt = el ? el.getAttribute("startsAt"): null;
            return startsAt ? Number(startsAt) : false;
        },

        /**
         * Reads mensurBlockStartsAt attribute from element
         * @param {DOMElement} el 
         * @returns {Number}
         * @memberof durIO
         */
        readBlockFrom : function (el) {
            var blockFrom = el ? el.getAttribute("mensurBlockStartsAt"): null;
            return blockFrom ? Number(blockFrom) : false;
        },
        
        /**
         * Retrieves beat structure and writes it to @beatPos
         * @param {DOMElement} el 
         * @param {Number} blockPos Current starting position within block
         * @param {DOMElement} mens 
         * @returns {Array}
         * @memberof durIO
         */
        setBeatPos : function (el, blockPos, mens) {
            var beatStructure = rm.beatUnitStructure(blockPos, mens);
            el.setAttributeNS(null, 'beatPos', beatStructure.join(', '));

            return beatStructure;
        },

        /**
         * Compares two beat structures and sets the attributes
         * @onTheBreveBeat and @crossedABreveBeat
         * @param {DOMElement} el 
         * @param {Array} prevBeatStructure 
         * @param {Array} beatStructure 
         * @param {Array} minimStruct 
         * @memberof durIO
         */
        setBreveBoundaries : function (el, prevBeatStructure, beatStructure, minimStruct) {
            if(beatStructure[0]===0 && beatStructure[1]===0 && beatStructure[2]===0)
            {
                el.setAttributeNS(null, 'onTheBreveBeat', beatStructure[3]);
            } 
            else if(!(beatStructure[5]===prevBeatStructure[5]
                    && beatStructure[4]===prevBeatStructure[4]
                    && beatStructure[3]===prevBeatStructure[3]))
            {
                el.setAttributeNS(null, 'crossedABreveBeat', breveDifference(beatStructure, prevBeatStructure, minimStruct));
            }
        },

        /**
         * Sets @dur.ges for each event per block according to the
         * provided block proportion multiplier
         * @param {meiDoc.block} sectionBlocks 
         * @memberof durIO
         */
        setDurGesPerBlock : function (sectionBlocks) {
            // write dur.ges
            for (let block of sectionBlocks)
            {
                let propMultiplier = block.prevPropMultiplier;
                let events = block.events;
                for (let event of events)
                {
                    if(rm.noteOrRest(event))
                    {
                        durIO.writeDurGes(event, propMultiplier);
                    }
                }
            }
        }
    
    };
})();