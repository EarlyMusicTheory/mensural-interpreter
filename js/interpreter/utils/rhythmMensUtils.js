/** 
 * @fileoverview 
 * Utility functions IV and V
 * Functions that know something about mensuration and simple rhythm functions */
 "use strict";

 /** 
  * @namespace rm
  * @desc Contains functions that know something about mensuration, simple rhythms and musical events.
  * Encapsulates basic MEI knowledge.
  */
 
 var rm = (function() {

    /**
     * Convert mei:@dur to an integer (semifusa=0, semibrevis=4, maxima=7)
     * @param {String} dur @dur string
     * @return {Integer} (semifusa=0, semibrevis=4, maxima=7)
     * @memberof rm
     * @inner
     */
     function noteIntFromDur(dur){
        var noteInt = ['semifusa', 'fusa', 'semiminima', 'minima', 'semibrevis', 'brevis', 'longa', 'maxima'].indexOf(dur);
        if(dur==="2B"||dur==="3B") noteInt = 6;
        return noteInt
    }

    return {

        /**
         * Reads the attributes of a mei:mensur element and returns a
         * four-element array of 2s or 3s for the perfection of each level
         * from prolation to major modus
         * @param {DOMElement} mensur mei:mensur element
         * @return {Array} Four-element array [prolatio, tempus, modusminor, modusmaior]
         * @memberof rm
         */ 
        mensurSummary : function (mensur){
            return [mensur.getAttributeNS(null, 'prolatio'), 
                    mensur.getAttributeNS(null, 'tempus'), 
                    mensur.getAttributeNS(null, 'modusminor'), 
                    mensur.getAttributeNS(null, 'modusmaior')].map(x=>x?parseInt(x, 10) : false);
        },

        /**
         * Return the number of minims that a given note would be expected to
         * have, given the prevailing mensuration.
         * @param {DOMElement} el mei:note
         * @param {DOMElement} mens mei:mensur
         * @param {Integer} levelAdjust Displaces the note level (so, if el is
         * a minim, 1 for levelAdjust will treat it as a semibreve)
         * @return {integer} Minim count
         * @memberof rm
         */
         simpleMinims : function (el, mensur, levelAdjust) {
            var level = this.noteInt(el) - 3;
            if(levelAdjust) level+= levelAdjust;
            if(level<1) return Math.pow(2, level);
            var minims = 1;
            var exponents = this.mensurSummary(mensur);
            for(var i=0; i<level; i++){
                if(exponents[i]) {
                    minims = minims * exponents[i];
                } else {
                    console.log('missing info for', el, i, 'using', mensur, 'stupidly assuming 2');
                    minims = minims * 2;
                }
            }
            return minims;
        },

        /**
         * Return the duration level of a note or rest as an integer (semifusa=0, semibrevis=4, maxima=7)
         * @param {DOMObject} el mei:note or mei:rest (or other object with mei:@dur)
         * @return {Integer} (semifusa=0, semibrevis=4, maxima=7)
         * @memberof rm
         */
         noteInt : function (el){
            return noteIntFromDur(el.getAttributeNS(null, 'dur'));
        },

        /**
         * @num and @numbase seem to be relative to a purely imperfect
         * interpretation of note division. This function takes an element and
         * returns the number of minims it would consist of if all notes
         * divided into two parts. For notes shorter than a minim, it returns false
         * @param {DOMElement} el An mei:note or mei:rest
         * @returns {Integer | Boolean} 
         * @memberof rm
         */
        dupleMinimCountFromElement : function (el){
            var level = this.noteInt(el);
            if(level<3) return false;
            return Math.pow(2, level-3);
        },

        /**
         * Return true if event is a dot of augmentation. Assumes that this is
         * indicated using @mei:form=aug. In the longer term, this might be
         * the place to put more sophisticated reasoning in (or it might be
         * better as a pre-processing step).
         * @param {DOMObject} event Probably an mei:dot
         * @returns {Boolean} 
         * @memberof rm
         */
        augDot : function (event){
            return event.tagName==='dot' && event.getAttributeNS(null, 'form')==='aug';
        },

        /**
         * Return true if event is a dot of division. Assumes that this is
         * indicated using @mei:form!=aug. In the longer term, this might be
         * the place to put more sophisticated reasoning in (or it might be
         * better as a pre-processing step).
         * @param {DOMObject} event Probably an mei:dot
         * @returns {Boolean} 
         * @memberof rm
         */
        divisionDot : function (event) {
            return event.tagName==='dot' && event.getAttributeNS(null, 'form')!=='aug';
        },

        /**
         * Is note perfect as a whole, i.e. is it divisible into 3 direct
         * parts (for example, a breve is regularly perfect in perfect tempus,
         * minor prolation and in imperfect tempus, major prolation, but only
         * in the former case is it perfect as a whole)
         * @param {DOMObject} note
         * @param {DOMObject} mens
         * @returns {Boolean} 
         * @memberof rm
         */
        notePerfectAsWhole : function (note, mens){
            if(this.isNote(note)){
                var level = this.noteInt(note);
                var msum = this.mensurSummary(mens);
                return ([false, false, false, false].concat(msum))[level] === 3;
            } return false;
        },

        /**
         * Return an integer (semifusa=0, fusa=1,...maxima=7) of the first
         * (shortest) level that is divisible into 3 parts.
         * @param {DOMObject} mensuration mei:mensur
         * @returns {Integer} Mensural level (semifusa=0, ..., minima=3,...maxima=7)
         * @memberof rm
         */
        firstPerfectLevel : function (mensuration){
            var firstPerf = this.mensurSummary(mensuration).indexOf(3);
            if(firstPerf===-1){
                return 20;
            } else {
                return firstPerf+3;
            }
        },

        /**
         * A note or rest is regularly perfect if it or any parts of it are
         * are ternary according to the mensuration sign. 
         * @param {DOMObject} element
         * @param {DOMObject} mensur mei:mensur element
         * @return {Boolean}
         * @memberof rm
         *  @todo Something is wrong here!
         */
        regularlyPerfect : function (element, mensur){
            var val = this.noteInt(element);
            if(val>3)
            {
                if(mensur.getAttributeNS(null, 'prolatio')==="2"){
                    if(val>4)
                    {
                        if(mensur.getAttributeNS(null, 'tempus')==="2")
                        {
                            if(val>5)
                            {
                                if(!mensur.getAttributeNS(null, 'modusminor')
                                    || mensur.getAttributeNS(null, 'modusminor')==="2")
                                {
                                    if(val>6)
                                    {
                                        if(!mensur.getAttributeNS(null, 'modusmaior')
                                            || mensur.getAttributeNS(null, 'modusmaior')==="2")
                                        {
                                            return false;
                                        } else return true;
                                    } else return false
                                } else return true;
                            } else return false;
                        } else return true;
                    } else return false;
                } else return true;
            } 
            else {
                return false;
            }
        },

        /**
         * Given the output of {@link mensurSummary}, return an array of minim
         * counts for each level.
         * @param {Array} mensurSummary Mensural structure (2 for
         * duple/imperfect and 3 for triple/perfect for each level)
         * @param {Integer} [maxLevel=4] Stopping point
         * @return {Array}
         * @memberof rm
         */
        minimStructures : function (mensurSummary, maxLevel) {
            var counts = [];
            var minims = 1;
            for(var i=0; i < (maxLevel ? maxLevel : 4); i++){
                minims = minims*(mensurSummary[i] ? mensurSummary[i] : 2);
                counts.push(minims);
            }
            return counts;
        },
        
        /**
         * True if the supplied element is a note contained in a ternary unit
         * @param {DOMObject} el
         * @param {DOMObject} mensur
         * @returns {Boolean} 
         * @memberof rm
         */
        isAlterable : function (el, mensur) {
            var m = this.mensurSummary(mensur);
            var durPos = this.noteInt(el) - 3;
            if(durPos<0 || durPos>3 || (m[durPos]===2 || m[durPos]===false) || el.tagName==="rest"){
                return false;
            } else return true;
        },

        /**
         * Return true if event is a note or rest
         * @param {DOMObject} event Event from MEI
         * @returns {Boolean} 
         * @memberof rm
         */
        noteOrRest : function (event) {
            return event.tagName==='rest' || event.tagName==='note';
        },

        /**
         * Return true if event is a note
         * @param {DOMObject} event Event from MEI
         * @returns {Boolean} 
         * @memberof rm
         */
         isNote : function (event) {
            return event.tagName==='note';
        },

        /**
         * Return true if event is a rest
         * @public
         * @param {DOMObject} event Event from MEI
         * @returns {Boolean} 
         */
         isRest : function (event) {
            return event.tagName==='rest';
        },
        
        /**
         * Returns true if event has @colored attribute
         * @param {DOMObject} event 
         * @returns {Boolean}
         * @memberof rm
         */
        isColored : function (event) {
            return event.getAttributeNS(null, 'colored')==="true";
        },
           
        /**
         * True if e1 and e2 are notes or rests at the same mensural level
         * (e.g. minima or semibrevis)
         * @param {DOMObject} e1 mei:note or mei:rest
         * @param {DOMObject} e2 mei:note or mei:rest
         * @returns {Boolean} 
         * @memberof rm
         */
         leveleq : function (e1, e2) {
            return e1.getAttributeNS(null, 'dur')===e2.getAttributeNS(null, 'dur');
        },

        /**
         * Return an array of an event's position with respect to all mensural
         * levels.
         * @param {Number} startMinims Minim steps since the start of the
         * counting period
         * @parm {DOMObject} mens mei:mensur
         * @returns {Array<Number>}
         * @memberof rm
         */
        beatUnitStructure : function (startMinims, mens){
            var rem = startMinims;
            var levels = this.minimStructures(this.mensurSummary(mens));
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

     }
 })();