"use strict";

/**
 * @fileoverview This file contains the MEIdoc class
 * 
 * Trying to fak some kind of private scope for the class.
 * Used https://blog.bitsrc.io/doing-it-right-private-class-properties-in-javascript-cc74ef88682e
 */

/**
 * @class
 * @property text
 * @property doc
 */
var MEIdoc = (() => {
    const parser = new DOMParser();
    const serializer = new XMLSerializer();
    
    class MEIdoc {
        constructor(meiText) {
            this.meidoc = meiText ? parser.parseFromString(meiText, "text/xml") : null;
        }

        get text() {
            return this.meidoc ? serializer.serializeToString(this.meidoc) : null;
        }
        set text(meiText) {
            this.meidoc = parser.parseFromString(meiText, "text/xml");
        }

        get doc() {
            return this.meidoc ? this.meidoc : null;
        }
        set doc(meiDocTree) {
            this.meidoc = meiDocTree;
        }
     
    }  
    return MEIdoc;
  })();


