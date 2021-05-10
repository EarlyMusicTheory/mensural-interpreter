"use strict";

/**
 * @namespace post
 * @desc Contains postprocessing wrap up, like drawing barlines
 */

var post = (function() {
    /** private */

    /**
     * MEI namespace for element generation
     */
    const meiNS = "http://www.music-encoding.org/ns/mei";

    /**
     * Adds barlines to an interpreted MEIdoc
     * Dotted barlines within blocks, solid barlines at the end of a block
     * @param {MEIdoc} meiDoc 
     * @memberof post
     * @inner
     */
    function addBarLines (meiDoc){
        var blocks = meiDoc.blocks;
        for (let b = 0; b < blocks.length; b++)
        {
            for (let e = 0; e < blocks[b].events.length; e++) 
            {
                var event = blocks[b].events[e];
                var previousSibling = event.previousElementSibling;
                // it needs to be decided when a barline gets drawn
                if (event.getAttributeNS(null, "onTheBreveBeat") && previousSibling) 
                {
                    let line = meiDoc.doc.createElementNS(meiNS, "barLine");
                    
                        
                    if (previousSibling.tagName==="note"||previousSibling.tagName==="rest"||previousSibling.tagName==="dot")
                    {
                        line.setAttributeNS(null, "form", "dotted");
                        event.parentElement.insertBefore(line, event);
                    }
                    else if ((previousSibling.tagName==="mensur"||previousSibling.tagName==="proport")
                        && previousSibling.previousElementSibling!==null)
                    {
                        line.setAttributeNS(null, "form", "single");
                        previousSibling.parentElement.insertBefore(line, previousSibling);
                    }
                }
            }
        }
    }

    return{
        
        /**
         * Runs postprocessing functions
         * @param {MEIdoc} meiDoc 
         * @memberof post
         */
        run : function (meiDoc) {
            addBarLines(meiDoc);
        }
    }
})();