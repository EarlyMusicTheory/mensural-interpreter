"use strict";

/** 
 * @fileoverview 
 * The ioHandler is the connecting layer between the meiFile and the interpreter or the user interface.
 * The interpreter writes and reads it's output through ioHandler.
 * The user interface retrieves data from the meiFile through ioHandler and writes user input to the meiFile.
 */

/** 
 * @namespace ioHandler
 * @desc The ioHandler is the connecting layer between the meiFile and the interpreter or the user interface.
 */

var ioHandler = (function() {
    // private

    /**
     * determine data storage in MEIdoc
     */
    const attributes = ["num", "numbase", "dur.quality", "dur.ppq"];

        function setAttr(element, propObject) {
            for(let attr in propObject)
            {
                element.setAttributeNS(null, attr, propObject[attr]);
            }
        }

        function getAttr(element, propName) {
            var attr;
            
            if(propName)
            {
                attr = element.getAttributeNS(null, propName);
            }
            else
            {
                attr = {};

                for (let attribute of element.attributes)
                {
                    attr[attribute.nodeName] = attribute.value;
                }
            }

            return attr;
        }

        function getAnnot(elementID, propName) {
            var annotations = meiFile.getAnnotation(elementID);

            var annots = null;

            // there are no annotations before the interpreter has run!
            if(annotations)
            {
                annots = {};
                for (let annot of annotations.children)
                {
                    let annotType = annot.getAttribute("type");
                    let annotValue = annot.innerHTML;
                    annots[annotType] = annotValue;
                }
            }

            // if a propName is given, we retrieve only the defined property
            if(propName)
            {
                annots = annots[propName];
            }

            return annots;
        }

        function setAnnot(elementID, propObject) {
            var annot;

            // pulling the gobal document like a bunny out of the hat is bad, 
            // but just live with it in this one case...
            if(meiFile.annotations[elementID])
            {
                annot = meiFile.getAnnotation(elementID);
            }
            else 
            {
                annot = meiFile.addAnnotation(elementID);
            }

            for (let attr in propObject)
            {
                let attrAnnot = getAnnotElement(elementID, attr);
                if(attrAnnot==null)
                {
                    attrAnnot = meiFile.addMeiElement("annot");
                    attrAnnot.setAttribute("type", attr);
                }
                attrAnnot.innerHTML = propObject[attr];
                annot.appendChild(attrAnnot);
            }

        }

        function getAnnotElement(elementID, propName) {
            var attrEl = null;

            if(meiFile.getAnnotation(elementID))
            {
                let annot = meiFile.annotations[elementID];
                attrEl = meiFile.doXPathOnDoc("./mei:annot[@type='" + propName + "']", annot, 9).singleNodeValue;
            }

            return attrEl;
        }

    return {
        //public

        getProperty : function (element, propName) {
            // read properties from attrs and annots to handle non note-rest objects
            // since annots get merged into attrs, annots overwrite attr values
            // this is intended!
            
            var property = {};

            let attrs = getAttr(element);
            let annots = getAnnot(element.getAttribute("xml:id"));

            property = {...attrs, ...annots};

            if(propName)
            {
                property = property[propName];
            }
                        
            return property;
        },

        getPropertyByID : function (elementID, propName) {
            let element = meiFile.eventDict[elementID];

            return this.getProperty(element, propName);
        },

        setProperty : function (element, propObject) {
            var annots = {};
            var attrs = {};

            for(const [key, value] of Object.entries(propObject))
            {
                // attributes need to be set redundantly because 
                // it's not possible to track corrections within attributes
                if(attributes.find(item => item === key))
                {
                    attrs[key] = value;
                }
                //else
                //{
                    annots[key] = value;
                //}
            }

            if(Object.entries(attrs)) setAttr(element, attrs);
            if(Object.entries(annots)) setAnnot(element.getAttribute("xml:id"), annots);
        },

        setPropertyByID : function (elementID, propObject) {
            let element = meiFile.eventDict[elementID];

            this.setProperty(element, propObject);
        },

        submitFeedback(feedbackObj, elementID) {
            //get user credentials out of feedbackObj
            var userName = feedbackObj["resp.name"];
            var userIni = feedbackObj["resp.initials"];
            delete feedbackObj["resp.name"];
            delete feedbackObj["resp.initials"];

            this.setPropertyByID(elementID, feedbackObj);
        },

        readFeedback() {
            
        }

    }
})();