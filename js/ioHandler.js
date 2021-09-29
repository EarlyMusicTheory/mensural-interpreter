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

    /**
     * Writes attributes from a dictonary object to the element.
     * Dictionary keys contain attribute names.
     * @param {Element} element 
     * @param {Object<string,string>} propObject 
     */
    function setAttr(element, propObject) {
        for(let attr in propObject)
        {
            element.setAttributeNS(null, attr, propObject[attr]);
        }
    }

    /**
     * Retrieves the value of a specified attribute or a dictionary of attribute values.
     * @param {Element} element 
     * @param {Object<string,string>} propObject 
     * @returns {string|Object<string,string>} attribute value(s)
     */
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

    /**
     * Retrieves either a dictionary of annotation values for an element or the value of one property.
     * @param {string} elementID xml:id of element
     * @param {string} propName 
     * @returns {string|Object<string,string>} annotation value(s)
     */
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

    /**
     * Modifies or add annotations for the defined element
     * @param {string} elementID xml:id of element
     * @param {Object<string,string>} propObject 
     * @param {string} resp URI to responsible agent in header, default is interpreter
     */
    function setAnnot(elementID, propObject, resp = "#mensural-interpreter") {
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
                attrAnnot.setAttribute("resp", resp);
                annot.appendChild(attrAnnot);
            }

            /** 
             * Choose whether value is just added, or correction should be added:
             * * If there is no value, just add value
             * * In interpreter mode: After interpreter has finished, add corr
             * * In instructor mode: If resp is not identical, add corr
             */
            if (
                attrAnnot.textContent==="" ||
                (instructor===false && complexAnalysisDone===false) ||
                (instructor===true && attrAnnot.getAttribute("resp")===resp)
                )
            {
                attrAnnot.textContent = propObject[attr];
            }
            else
            {
                addCorr(elementID, attr, propObject[attr], resp);
            }
        }
    }

    /**
     * Returns the annot element for a described element and a given property name.
     * @param {string} elementID 
     * @param {string} propName 
     * @returns {Element} annot element
     */
    function getAnnotElement(elementID, propName) {
        var attrEl = null;

        if(meiFile.getAnnotation(elementID))
        {
            let annot = meiFile.annotations[elementID];
            attrEl = meiFile.doXPathOnDoc("./mei:annot[@type='" + propName + "']", annot, 9).singleNodeValue;
        }

        return attrEl;
    }

    /**
     * Adds a choice with sic/corr to an inner anotation
     * @param {string} elementID 
     * @param {string} propName 
     * @returns {Element} annot element with choice
     */
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
    
    /**
     * Add a correction of an annotation if the value differs
     * @param {string} elementID xml:id of element
     * @param {string} propName property name
     * @param {string} corrValue new correct value
     * @param {string} resp responsible agent for the new value
     */
    function addCorr(elementID, propName, corrValue, resp) 
    {
        var oldValue = getAnnot(elementID, propName);

        // add apparatus only if values differ
        if (corrValue!=oldValue)
        {
            var attrEl = addApp(elementID, propName);

            if(attrEl!==null)
            {
                let oldResp = attrEl.getAttribute("resp");
            
                let corrEl = meiFile.doXPathOnDoc("descendant::mei:corr", attrEl, 9).singleNodeValue;
                corrEl.textContent = corrValue;
                if(resp && resp !== oldResp)
                {
                    corrEl.setAttribute("resp", resp);
                    let sicEl = meiFile.doXPathOnDoc("descendant::mei:sic", attrEl, 9).singleNodeValue;
                    sicEl.setAttribute("resp", oldResp);
                    attrEl.removeAttribute("resp");
                }
            }
        }
    }

    /**
     * Retrieves the (correct) valid value of an annot.
     * @param {Element} propAnnot 
     * @returns {string}
     */
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

    /**
     * Retrieves the (wrong) non-valid value of an annot.
     * @param {Element} propAnnot 
     * @returns {string}
     */
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

    /*function getSic(elementID, propName) 
    {
        return meiFile.doXPathOnDoc("descendant::mei:sic", propAnnot, 9).singleNodeValue;
    }

    function getCorr(elementID, propName)
    {
        return meiFile.doXPathOnDoc("descendant::mei:corr", propAnnot, 9).singleNodeValue
    }*/

    /**
     * Adds a <respStmt> to the title statement of the file description.
     * Will only be added for names that aren't contained in a <respStmt> yet.
     * @param {string} respTxt role of responsibility
     * @param {*} name name of responsible agent
     * @param {*} initials initials of respinsible agent
     */
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

    return {
        //public

        /**
         * Read properties from attrs and annots to handle non note-rest objects.
         * Since annots get merged into attrs, annots overwrite attr values,
         * this is intended!
         * @param {Element} element 
         * @param {string} propName 
         * @param {boolean} app True if sic and corr should be returned
         * @returns {string|Object}
         */
        getProperty : function (element, propName, app = false) {
            // 
            
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

        /**
         * Read properties from attrs and annots to handle non note-rest objects.
         * Since annots get merged into attrs, annots overwrite attr values,
         * this is intended!
         * @param {string} elementID 
         * @param {string} propName 
         * @param {boolean} app True if sic and corr should be returned
         * @returns {string|Object}
         */
        getPropertyByID : function (elementID, propName, app = false) {
            let element = meiFile.eventDict[elementID];

            return this.getProperty(element, propName, app);
        },

        /**
         * Writes properties to attributes and annotations for the given element.
         * @param {Element} element 
         * @param {Object} propObject 
         * @param {string} resp URI to responsible agent in header, default is interpreter
         */
        setProperty : function (element, propObject, resp = "#mensural-interpreter") {
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
            if(Object.entries(annots)) setAnnot(element.getAttribute("xml:id"), annots, resp);
        },

        /**
         * Writes properties to attributes and annotations for the given element.
         * Takes xml:id of affected element.
         * @param {string} elementID 
         * @param {Object} propObject 
         * @param {string} resp URI to responsible agent in header, default is interpreter
         */
        setPropertyByID : function (elementID, propObject, resp = "#mensural-interpreter") {
            let element = meiFile.eventDict[elementID];

            this.setProperty(element, propObject, resp);
        },

        /**
         * Writes the user input about a certain element.
         * Addresses the affected element by xml:id.
         * @param {Object} feedbackObj 
         * @param {string} elementID 
         */
        submitFeedback(feedbackObj, elementID) {
            //get user credentials out of feedbackObj
            var userName = feedbackObj["resp.name"];
            var userIni = "#" + feedbackObj["resp.initials"];
            delete feedbackObj["resp.name"];
            delete feedbackObj["resp.initials"];

            var text = "Evaluated interpreter results.";
            var resp = "evaluated by";

            if(instructor===true)
            {
                text = "Resolved durations in mensural instuctor mode";
                resp = "resolved by";
            }

            // create respStmt in Header if not done already
            addRespStmt(resp, userName, userIni);
            meiFile.addRevision(userIni, text);
            
            // check which values differ
            // update values into sic/corr
            var currentValues = getAnnot(elementID);

            for(const [key, value] of Object.entries(feedbackObj))
            {
                if(value==null || 
                    (currentValues &&
                        (currentValues[key] && value===currentValues[key]))
                )
                {
                    delete feedbackObj[key];
                }
            }

            this.setPropertyByID(elementID, feedbackObj, userIni);
        }
    }
})();