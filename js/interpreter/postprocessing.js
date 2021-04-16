"use strict";

/**
 * @module interpreter/post
 * Contains postprocessing wrap up
 */

var post = (function() {
    /** private */

    const meiNS = "http://www.music-encoding.org/ns/mei";
    function addBarLines (meiDoc){
        var blocks = meiDoc.blocks;
        for (let b = 0; b < blocks.length; b++)
        {
            for (let e = 0; e < blocks[b].events.length; e++) 
            {
                var event = blocks[b].events[e];
                var previousSibling = event.previousElementSibling;
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
        /** public */
        run : function (meiDoc) {
            addBarLines(meiDoc);
        }
    }
})();