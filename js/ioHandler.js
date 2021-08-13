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
    const attributes = ["num", "numbase", "dur.quality", "dur.metrical"];

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
                    let annotValue = getCorrValue(annot);
                    let annotSic = getSicValue(annot);
                    if (annotSic)
                    {
                        annots[annotType] = {sic: annotSic, corr: annotValue};
                    }
                    else
                    {
                        annots[annotType] = annotValue;
                    }
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
                    annot.appendChild(attrAnnot);
                }

                // set value as standard if there is no value there or the interpreter isn't finished
                if (complexAnalysisDone===false || attrAnnot.textContent==="")
                {
                    attrAnnot.textContent = propObject[attr];
                }
                else
                {
                    addCorr(elementID, attr, propObject[attr]);
                }
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

        function addApp(elementID, propName)
        {
            var attrEl = getAnnotElement(elementID, propName);
            if(attrEl)
            {
                if(attrEl.getElementsByTagName("choice").length===0)
                {
                    let oldValueNowSic = attrEl.textContent;
                    attrEl.textContent = '';
                    let choice = meiFile.addMeiElement("choice");
                    attrEl.appendChild(choice);

                    let sic = meiFile.addMeiElement("sic");
                    choice.appendChild(sic);
                    sic.textContent = oldValueNowSic;

                    let corr = meiFile.addMeiElement("corr");
                    choice.appendChild(corr);
                }

                return attrEl;
            }
            else
            {
                return null;
            }
        }

        // don't implement this now: a value once set wil be set for eternity
        // function setSic(elementID, propName, sicValue) {}
        
        function addCorr(elementID, propName, corrValue, resp) 
        {
            var oldValue = getAnnot(elementID, propName);

            // add apparatus only if values differ
            if (corrValue!=oldValue)
            {
                var attrEl = addApp(elementID, propName);

                if(attrEl!==null)
                {
                    let corrEl = meiFile.doXPathOnDoc("descendant::mei:corr", attrEl, 9).singleNodeValue;
                    corrEl.textContent = corrValue;
                    if(resp)
                    {
                        corrEl.setAttribute("resp", "#" + resp);
                    }
                }
            }
        }

        function getCorrValue(propAnnot)
        {
            var corrValue;
            let corrEl = meiFile.doXPathOnDoc("descendant::mei:corr", propAnnot, 9).singleNodeValue;

            if(corrEl)
            {
                corrValue = corrEl.textContent;
            }
            else
            {
                corrValue = propAnnot.textContent;
            }

            return corrValue;
        }

        function getSicValue(propAnnot)
        {
            var sicValue = null;
            let sicEl = meiFile.doXPathOnDoc("descendant::mei:sic", propAnnot, 9).singleNodeValue;

            if(sicEl)
            {
                sicValue = sicEl.textContent;
            }

            return sicValue;
        }

        function getSic(elementID, propName) 
        {
            return meiFile.doXPathOnDoc("descendant::mei:sic", propAnnot, 9).singleNodeValue;
        }

        function getCorr(elementID, propName)
        {
            return meiFile.doXPathOnDoc("descendant::mei:corr", propAnnot, 9).singleNodeValue
        }

        function addRespStmt(respTxt, name, initials)
        {
            var titleStmt = meiFile.doXPathOnDoc("//mei:fileDesc/mei:titleStmt", meiFile.doc, 9).singleNodeValue;
            var respRes = meiFile.doXPathOnDoc("./mei:respStmt[./mei:resp='"+respTxt+"']", titleStmt, 5);
            var respStmt = respRes.iterateNext();

            var respPersNames = [];

            while (respStmt)
            {
                let persName = respStmt.getElementsByTagName("persName")[0];
                respPersNames.push(persName.textContent);

                respStmt = respRes.iterateNext();
            }

            if(respStmt == null && respPersNames.indexOf(name)===-1) 
            {
                respStmt = meiFile.addMeiElement("respStmt");
                titleStmt.append(respStmt);
                let resp = meiFile.addMeiElement("resp");
                resp.textContent = respTxt;
                respStmt.append(resp);
                let persName = meiFile.addMeiElement("persName", initials);
                persName.textContent = name;
                respStmt.append(persName);
            }
        }

        function addRevision(initials)
        {
            var revisionDesc = meiFile.doXPathOnDoc("//mei:revisionDesc", meiFile.doc, 9).singleNodeValue;

            let checkForExistingChange = "//mei:change[@resp='#" + initials + 
                                        "' and .//mei:p[contains(text(),'Evaluated interpreter results.')]]";
            var existingChange = meiFile.doXPathOnDoc(checkForExistingChange, revisionDesc, 9).singleNodeValue;
            var date = new Date();
            if(existingChange==null)
            {  
                // add change as last child
                var change = meiFile.addMeiElement("change");
                revisionDesc.append(change);
                // add isodate and resp
                change.setAttribute("resp", "#" + initials);
                change.setAttribute("isodate", date.toISOString());
                // add changeDesc and p
                let p = meiFile.addMeiElement("p");
                p.textContent = "Evaluated interpreter results.";
                let changeDesc = meiFile.addMeiElement("changeDesc");
                changeDesc.append(p);
                change.append(changeDesc);
            }
            else
            {
                if(!existingChange.attributes["startdate"])
                {
                    existingChange.setAttribute("startdate", existingChange.getAttribute("isodate"));
                }
                existingChange.setAttribute("isodate", date.toISOString());
            }
        }

    return {
        //public

        getProperty : function (element, propName, app = false) {
            // read properties from attrs and annots to handle non note-rest objects
            // since annots get merged into attrs, annots overwrite attr values
            // this is intended!
            
            var property = {};

            let attrs = getAttr(element);
            let annots = getAnnot(element.getAttribute("xml:id"));

            // if we don't need apparati (most cases), just return corrected values
            if(app===false)
            {
                for (let attr in annots)
                {
                    if(typeof annots[attr] !== "string")
                    {
                        annots[attr] = annots[attr].corr;
                    }
                }
            }

            property = {...attrs, ...annots};

            if(propName)
            {
                property = property[propName];
            }
                        
            return property;
        },

        getPropertyByID : function (elementID, propName, app = false) {
            let element = meiFile.eventDict[elementID];

            return this.getProperty(element, propName, app);
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

            // create respStmt in Header if not done already
            addRespStmt("evaluated by", userName, userIni);
            addRevision(userIni);
            
            // check which values differ
            // update values into sic/corr
            var currentValues = getAnnot(elementID);

            for(const [key, value] of Object.entries(feedbackObj))
            {
                if(value!=null && value!==currentValues[key])
                {
                    addCorr(elementID, key, feedbackObj[key], userIni);
                    if(attributes.find(item => item === key))
                    {
                        let element = meiFile.eventDict[elementID];
                        let attrObj = {};
                        attrObj[key] = value;
                        setAttr(element, attrObj);
                    }
                }
            }
        }
    }
})();