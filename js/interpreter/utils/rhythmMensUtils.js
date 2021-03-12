/** 
 * @fileoverview 
 * Utility functions IV and V
 * Functions that know something about mensuration and simple rhythm functions */
 "use strict";

 /** 
  * @module interpreter/utils/rhythmMensUtils
  */
 
 var rhythmMensUtils = (function() {
    /** @private */ 

    /**
     * @private
     * Reads the attributes of a mei:mensur element and returns a
     * four-element array of 2s or 3s for the perfection of each level
     * from prolation to major modus
     * @param {DOMElement} mensur mei:mensur element
     * @return {Array} Four-element array
     */ 
     function mensurSummary(mensur){
        return [mensur.getAttributeNS(null, 'prolatio'), 
                mensur.getAttributeNS(null, 'tempus'), 
                mensur.getAttributeNS(null, 'modusminor'), 
                mensur.getAttributeNS(null, 'modusmaior')].map(x=>x?parseInt(x, 10) : false);
    }

    /**
     * @private
     * Convert mei:@dur to an integer (semifusa=0, semibrevis=4, maxima=7)
     * @param {String} dur @dur string
     * @return {Integer}
     */
     function noteIntFromDur(dur){
        return ['semifusa', 'fusa', 'semiminima', 'minima', 'semibrevis', 'brevis', 'longa', 'maxima'].indexOf(dur);
    }

    return {
        /** @public */

        /**
         * @public
         * Return the number of minims that a given note would be expected to
         * have, given the prevailing mensuration.
         * @param {DOMElement} el mei:note
         * @param {DOMElement} mens mei:mensur
         * @param {Integer} levelAdjust Displaces the note level (so, if el is
         * a minim, 1 for levelAdjust will treat it as a semibreve)
         * @return {integer} Minim count
         */
         simpleMinims : function (el, mensur, levelAdjust) {
            var level = this.noteInt(el) - 3;
            if(levelAdjust) level+= levelAdjust;
            if(level<1) return Math.pow(2, level);
            var minims = 1;
            var exponents = mensurSummary(mensur);
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
         * @param {DOMObject} el mei:note or mei:rest (or other object with mei:@dur
         * @return {Integer}
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
         */
        augDot : function (event){
            return event.tagName==='dot' && event.getAttributeNS(null, 'form')==='aug';
        },

        /**
         * Is note perfect as a whole, i.e. is it divisible into 3 direct
         * parts (for example, a breve is regularly perfect in perfect tempus,
         * minor prolation and in imperfect tempus, major prolation, but only
         * in the former case is it perfect as a whole)
         * @param {} note
         * @param {} mens
         * @returns {} 
         */
        notePerfectAsWhole : function (note, mens){
            if(note.tagName==='note'){
                var level = this.noteInt(note);
                var msum = mensurSummary(mens);
                return ([false, false, false, false].concat(msum))[level] === 3;
            } return false;
        }

     }
 })();