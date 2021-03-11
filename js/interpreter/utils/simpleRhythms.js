/** @fileoverview Utility functions IV - Simple rhythm functions */
"use strict";

/** 
 * @module interpreter/utils/simpleRhythms
 * Simple rhythm functions
 */

var simpleRhythms = (function() {

    /**
     * Convert mei:@dur to an integer (semifusa=0, semibrevis=4, maxima=7)
     * @param {String} dur @dur string
     * @return {Integer}
     */
    function noteIntFromDur(dur){
        return ['semifusa', 'fusa', 'semiminima', 'minima', 'semibrevis', 'brevis', 'longa', 'maxima'].indexOf(dur);
    }

    return {
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
}
    };
})();