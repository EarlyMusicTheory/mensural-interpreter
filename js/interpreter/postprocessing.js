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
                if (ioHandler.getProperty(event,"onTheBreveBeat") && previousSibling) 
                {
                    let line = meiDoc.addMeiElement("barLine");
                    
                        
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

    /**
     * Adds application info to MEI file
     * <encodingDesc>
            <appInfo>
                <application xml:id="mensural-interpreter">
                    <name>Mensural interpreter</name>
                </application>
            </appInfo>
        </encodingDesc>
     * @param {MEIdoc} meiDoc 
     * @memberof post
     * @inner
     */
    function addAppInfo (meiDoc){
        // if there is no encodingDesc, add one behind fileDesc
        var meiHead = meiDoc.doXPathOnDoc("//mei:meiHead", meiDoc.doc, 9).singleNodeValue;
        var encodingDesc;

        if(meiHead.getElementsByTagName("encodingDesc").length===0)
        {
            let fileDesc = meiHead.getElementsByTagName("fileDesc")[0];
            encodingDesc = meiDoc.addMeiElement("encodingDesc");
            fileDesc.after(encodingDesc);
        }
        else
        {
            encodingDesc = meiHead.getElementsByTagName("encodingDesc")[0];
        }

        // if there is no appInfo, add it after head (or as first child)
        var appInfo = encodingDesc.getElementsByTagName("appInfo")[0];

        if(!appInfo)
        {
            appInfo = meiDoc.addMeiElement("appInfo");
            let head = encodingDesc.getElementsByTagName("head")[0];
            if(head)
            {
                head.after(appInfo);
            }
            else
            {
                encodingDesc.prepend(appInfo);
            }
        }

        // add application as last child of appInfo
        var app = meiDoc.addMeiElement("application", interpreter);
        appInfo.append(app);
        let name = meiDoc.addMeiElement("name");
        name.textContent = "Mensural interpreter";
        app.append(name);
    }

    return{
        
        /**
         * Runs postprocessing functions
         * @param {MEIdoc} meiDoc 
         * @memberof post
         */
        run : function (meiDoc) {
            addBarLines(meiDoc);
            addAppInfo(meiDoc);
            //addRevisionDesc(meiDoc);
            meiDoc.addRevision(intResp, "Resolved mensural durations.");
        }
    }
})();