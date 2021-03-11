/** @fileoverview Functions that know something about mensuration */
"use strict";

/** Functions that know something about mensuration
 * @module interpreter/utils/mens
 */

var mensUtils = (function() {
    /** private */

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

    return {
        /** public */

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
            var level = simpleRhythms.noteInt(el) - 3;
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
}
    };
})();