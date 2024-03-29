"use strict";

/**
 * @fileoverview This file contains the MEIdoc class
 * 
 * Trying to fake some kind of private scope for the class.
 * Used https://blog.bitsrc.io/doing-it-right-private-class-properties-in-javascript-cc74ef88682e
 * 
 */

/**
 * @namespace MEIdoc
 * @desc Contains MEIdoc class and private MEIdoc functions
 */
var MEIdoc = (() => {
    const parser = new DOMParser();
    const serializer = new XMLSerializer();

	/**
	 * Return all the sections that themselves contain no sections (we
	 * have a hierarchical tree structure for parts, so this only chooses
	 * the lowest level structural unit.
	 * @param {DOMObject} MEIDoc 
	 * @return {Array} Array of mei:section elements
	 * @see easyRhythms
	 */ 
	function getAtomicSections(MEIDoc){
		let sections = MEIDoc.getElementsByTagName('section');
		return Array.from(sections).filter(hasNoSections, MEIDoc);
	}

	/**
	 * Return true if x (an XML DOM object, normally MEI) contains *no*
	 * mei:sections. this needs to be set as a DOM document object.
	 * @param {DOMObject} x - the part of the tree.  
	 * @return {Boolean} 
	 */
	function hasNoSections(x){
		if(this.evaluate){
			return x.childElementCount!==0 && this.evaluate('count(mei:section)', x, nsResolver).numberValue===0;
		} else {
			return x.childElementCount!==0 && !x.getElementsByTagName('section').length;
		}
	}

	/**
	 * Return all layers for a section
	 * @param {DOMObject} section 
	 * @return {Array} Array of mei:layer elements 
	 */
	function getLayers(section){
		let sections = section.getElementsByTagName('layer');
		return Array.from(sections);
	}

	/**
	 * Creates an array of mensurally coherent blocks, each an object with
	 * mensuration and events attributes.
	 * @param {DOMObject} section The section to process
	 * @param {MEIdoc} meiDoc The parent MEI doc object
	 * @param {Object} prevMens The last mensuration of the previous block
	 * (this is the default for the first section of hte new block in some
	 * cases, if none is specified).
	 * @param {string} partNum Number of staff
	 * @return {Array<Object>} Array of mensurally coherent blocks
	 */
	function getEventsByMensurationForSection(section, meiDoc, prevMens, partNum){
		if(meiDoc.doc.createNodeIterator){
			var ni = meiDoc.doc.createNodeIterator(section, NodeFilter.SHOW_ELEMENT);
			var next = ni.nextNode();
		} else {
			var bucket = section.getElementsByTagName('*');
			var pointer = 0;
			var next = bucket[pointer];
		}
		var foo = [];
		var block = {part: partNum, mens: prevMens, events: foo, prevPropMultiplier: 1};
		// Assumed defaults (changed if evidence to the contrary)
		block.mens.setAttributeNS(null, 'modusmaior', 2);
		block.mens.setAttributeNS(null, 'modusminor', 2);
		var blocks = [block];
		var count2b = 0;
		var count3b = 0;
		while(next){
			if(next.tagName!=='rest')
			{
				if(block.mens)
				{
					if(count2b===2 || count3b===2) block.mens.setAttributeNS(null, 'modusmaior', 2);
					if(count2b===3 || count3b===3) block.mens.setAttributeNS(null, 'modusmaior', 3);
				}
				count2b = 0;
				count3b = 0;
			}
						
			switch(next.tagName){
				case 'mensur':
					if(foo.length){
						foo = [];
						let num = next.getAttribute("num");
						let numbase = next.getAttribute("numbase");
						let propMultiplier = (num && numbase) ? propProportionMultiplier(next) : 1;
						block = {part: partNum,
								mens:next, 
								prevPropMultiplier: propMultiplier,
								events: foo};
						blocks.push(block);
					} else {
						block.mens = next;
					}
					// Assumed defaults (changed if evidence to the contrary)
					if(!next.getAttributeNS(null, 'modusmaior')) block.mens.setAttributeNS(null, 'modusmaior', 2);
					if(!next.getAttributeNS(null, 'modusminor')) block.mens.setAttributeNS(null, 'modusminor', 2);
					break
				case 'proport':
					if(foo.length){
						foo = [];
						block = {part: partNum,
								mens:block.mens, 
								prop:next, 
								events: foo, 
								prevPropMultiplier: propProportionMultiplier(next)};
						blocks.push(block);
					} else {
						block.prop = next;
					}
					break				
				case 'rest':
					if(block.mens){
						if(next.getAttributeNS(null, 'dur')==='2B'){
							count2b++;
							block.mens.setAttributeNS(null, 'modusminor', 2);
						} 
						else if (next.getAttributeNS(null, 'dur')==='3B'){
							count3b++;
							block.mens.setAttributeNS(null, 'modusminor', 3);
						}
					}
				case 'note':
				case 'dot':
					foo.push(next);
					meiDoc.appendToIdDictionary(next.getAttributeNS(null, "id"), block)
                    //idDictionary[next.getAttributeNS(null, "id")] = block;
			}
			if(ni){
				next = ni.nextNode();
			} else {
				pointer++;
				next = pointer < bucket.length ? bucket[pointer]: false;
			}
		}
		return blocks	
	}

	/** 
	 * Name space manager function. Takes a prefix and returns the URL for
	 * that name space. In this case, though, pretty much hard-wired.
	 * @param {String} prefix The namespace prefix to retrieve as a URL
	 */
	function nsResolver(prefix){
		var ns = {
		'mei': "http://www.music-encoding.org/ns/mei"
		}
		return ns[prefix] || null;
	}

    /**
	 * Given a proportion-specifying element, give its implied multiplier
	 * @param {DOMObject} el proportion element
     * @returns {Number}
     */
    function propProportionMultiplier(el) {
        var num = el.getAttributeNS(null, 'num') || 1;
        var div = el.getAttributeNS(null, 'numbase') || 1;
        return Number(num) / Number(div);
    }
    

    /**
     * @class
     */
    class MEIdoc {
		/**
		 * @constructs MEIdoc
		 * @param {string} meiText 
		 */
        constructor(meiText) {
            this.meiDoc = meiText ? parser.parseFromString(meiText, "text/xml") : null;
			this.idDict = {};
			this.eventIdDict = {};
            this.sectionBlocks;
			this.annots = {};
			if(this.doc) this.initEventDict();
			this.meiBlob = this.meiDoc ? new Blob([this.text], {type: 'text/xml'}) : null;
			if(this.doc) this.getBlocksFromSections();
        }

		/**
		 * @property {string} text
		 */
        get text() {
            return this.doc ? serializer.serializeToString(this.doc) : null;
        }
        set text(meiText) {
            this.doc = parser.parseFromString(meiText, "text/xml");
			if (this.doc) this.getBlocksFromSections();
        }

		/** @property {DOMObject} doc */
        get doc() {
            return this.meiDoc ? this.meiDoc : null;
        }
        set doc(meiDocTree) {
            this.meiDoc = meiDocTree;
			this.preprocess();
			if(this.meiDoc) this.getBlocksFromSections();
			if(this.meiDoc) this.initEventDict();
			if(this.meiDoc) this.initAnnotations();
			if(this.meiDoc) this.meiBlob = new Blob([this.text], {type: 'text/xml'});
        }

		/**
		 * @property {Blob} blob
		 */
		get blob() {
			return this.meiBlob;
		}
		/**
		 * renew the blob after changes on the document tree
		 */
		renewBlob() {
			this.meiBlob = new Blob([this.text], {type: 'text/xml'});
		}

		/**
		 * @property {Array<Object>} blocks Mensurally coherent blocks
		 */
        get blocks() {
            return this.sectionBlocks;
        }
        set blocks(blockArray) {
            this.sectionBlocks = blockArray;
        }

		/**
		 * @property {Object.<string,Object>} idDictionary return block by event id
		 */
        get idDictionary() {
            return this.idDict;
        }
        set idDictionary(idDictObj) {
            this.idDict = idDictObj;
        }
		/**
		 * Adds an entry to the idDictionary
		 * @param {String} id 
		 * @param {Object} block 
		 */
        appendToIdDictionary(id, block) {
            this.idDict[id] = block;
        }
		/**
		 * Retrieves a block via the xml:id of one of its events
		 * @param {String} eventId 
		 * @returns {Object} block
		 */
        getBlockByEventId(eventId) {
            return this.idDictionary[eventId];
        }

		/**
		 * @property {Object.<string,Object>} eventDict id to xml element
		 */
		get eventDict () {
			return this.eventIdDict;
		}

		/**
		 * builds a dictionary to access an element via its xml:id
		 */
		initEventDict()  {
			var bucket = this.doc.getElementsByTagName('*');
			for (let element of bucket)
			{
				let id;
				if(element.getAttribute("xml:id"))
				{
					id = element.getAttribute("xml:id");
				}
				else
				{
					element.setAttribute("xml:id", "ID" + uuidv4());
					id = element.getAttribute("xml:id");
				}
				
				this.eventIdDict[id] = element;
			}
		}
		
		/**
		 * Creates a new mei element with the given name and registers
		 * it in the eventDict.
		 * @param {string} elName 
		 * @returns {DOMElement} created element
		 */
		addMeiElement(elName, id) {
			let el = this.doc.createElementNS(nsResolver("mei"), elName);
			if (!id)
			{
				id = "ID" + uuidv4();
			}
			el.setAttribute("xml:id", id);
			this.eventIdDict[id] = el;

			return el;
		}

		/** @property {Object.<string,Object>} annotations event id to annotations */
		get annotations () {
			return this.annots;
		}

		/**
		 * Initializes the annotations dictionary of the current MEI file.
		 */
		initAnnotations() {
			var annotationsFromFile = this.doXPathOnDoc("//mei:annot[@type='" + interpreter + "']", this.doc, 5);

			var loadedAnnotation = annotationsFromFile.iterateNext();

			while(loadedAnnotation)
			{
				let eventID = loadedAnnotation.getAttribute("startid").substring(1);
				this.annots[eventID] = loadedAnnotation;
				loadedAnnotation = annotationsFromFile.iterateNext();
			}
		}

		/**
		 * Retrieves the annotation control event for the event with the given id.
		 * @param {string} eventID xml:id of MEI event
		 * @returns {DOMElement} <annot>
		 */
		getAnnotation (eventID) {
			return this.annotations[eventID];
		}
		/**
		 * Creates an interpreter-related annotation about a certain element.
		 * @param {string} eventID 
		 * @returns {Element} newly created annot
		 */
		addAnnotation (eventID) {
			let annot = this.addMeiElement("annot");
			annot.setAttribute("startid", "#" + eventID);
			annot.setAttribute("type", interpreter);
			annot.setAttribute("audience", "private");

			let staff = this.doc.evaluate("./ancestor::mei:staff[1]", this.eventDict[eventID], nsResolver, 9).singleNodeValue;

			staff.appendChild(annot);

			this.annots[eventID] = annot;
			return annot;
		}

		/** non-property related methods */
        
		/**
		 * Build mensurally coherent blocks from current document
		 */
        getBlocksFromSections() {
			var sections = getAtomicSections(this.doc);
			var layers = []; 
			var sectionBlocks = [];
			//var layerMens = [];

			for (let i of sections)
			{
				let currentLayers = getLayers(i);
				currentLayers.forEach(layer => layers.push(layer));
			}

			var prevPartNum = "0";
			for (let i of layers)
			{
				let staffNum = i.parentElement.getAttribute("n");
				let prevMens = false;
				if(prevPartNum !== staffNum)
				{
					prevMens = this.doXPathOnDoc("//mei:staffDef[@n='"+staffNum+"']/mei:mensur",i,9).singleNodeValue;
				}
				else
				{
					prevMens = sectionBlocks[sectionBlocks.length - 1].mens;
				}
				let layerBlocks = getEventsByMensurationForSection(i, this, prevMens, staffNum);
				//layerMens[i] = layerBlocks[layerBlocks.length - 1].mens;
				layerBlocks.forEach(lBlocks => sectionBlocks.push(lBlocks));
				prevPartNum = staffNum;
			}

			this.blocks = sectionBlocks;
		}

        /**
         * Given a block index number, finds the proportion of that block and returns the factor.
		 * @param {integer} blockIndex mei:note or mei:rest
         * @returns {Number} 
         */
        proportionMultiplier(blockIndex){
            let block = this.blocks[blockIndex];
            // if(block.prop) console.log("so", blockProportionMultiplier(block));
            // return blockProportionMultiplier(block);
            if(block.prop){
                if(block.prop.getAttributeNS(null, 'multiplier')){
                    return Number(block.prop.getAttributeNS(null, 'multiplier'));
                } else {
                    return propProportionMultiplier(block.prop);
                }
            } else return 1;
        }

		/**
		 * Adds a revision to the MEIhead at the current date
		 * @param {string} resp URI to responsible agent
		 * @param {string} text change description
		 */
		addRevision(resp, text) {
			var revisionDesc = this.doXPathOnDoc("//mei:revisionDesc", meiFile.doc, 9).singleNodeValue;

			let checkForExistingChange = "//mei:change[@resp='" + resp + 
                                    "' and .//mei:p[contains(text(),'" + text + "')]]";
			var existingChange = meiFile.doXPathOnDoc(checkForExistingChange, revisionDesc, 9).singleNodeValue;
			var date = new Date();
			if(existingChange==null)
			{  
				// add change as last child
				var change = meiFile.addMeiElement("change");
				revisionDesc.append(change);
				// add isodate and resp
				change.setAttribute("resp", resp);
				change.setAttribute("isodate", date.toISOString());
				// add changeDesc and p
				let p = meiFile.addMeiElement("p");
				p.textContent = text;
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

		/**
		 * Preprocesses MEI file as a matter or normalization
		 * * merge adjacent <mensur> and <proport> into <mensur> (to keep them together and avoid Verovio strangeness?)
		 * 	 @todo adjust blockification
		 * * put first <clef> and <keySig> into <staffDef>
		 * * @todo maybe: delete empty <dir>
		 * * @todo maybe: delete empty <verse>
		 * * delete note/@lig if it is identical to ligature/@form
		 */
		preprocess(){
			
			// add revisionDesc if not available
			var meiHead = this.doXPathOnDoc("//mei:meiHead", this.doc, 9).singleNodeValue;
			var revisionDesc = meiHead.getElementsByTagName("revisionDesc")[0];
			if(!revisionDesc)
			{
				revisionDesc = this.addMeiElement("revisionDesc");
				meiHead.append(revisionDesc);
			}

			// clean up for every staff
			for(let staff of this.doc.getElementsByTagName("staff") )
			{
				//tidyClefKeySig(staff, this.doc);
				mergeAdjacentMensProp(staff);
				//putStartingMensToStaffDef(staff, this.doc)
				removeLig(staff);
			}

			// clean up only for first staffs per staffDef
			let staffNumIterator = this.doXPathOnDoc("//mei:staffDef/@n", this.doc, 5);
			let currentStaffNum = staffNumIterator.iterateNext();
			let staffNums = [];
			while(currentStaffNum)
			{
				staffNums.push(currentStaffNum.value);
				currentStaffNum = staffNumIterator.iterateNext();
			}
			for(let staffNum of staffNums)
			{
				let firstStaff = this.doXPathOnDoc("//mei:staff[@n='"+staffNum+"'][1]", this.doc, 5).iterateNext();
				tidyClefKeySig(firstStaff, this.doc);
				putStartingMensToStaffDef(firstStaff, this.doc);
			}
		}

		/**
		 * A convenient way to pipe XPath queries to the meiDoc.
		 * Uses the internal ns-resolver.
		 * @param {string} expression XPath expression
		 * @param {DOMElement|Document} context context element or document
		 * @param {integer} resultType https://developer.mozilla.org/en-US/docs/Web/API/Document/evaluate#result_types
		 * @returns {XPathResult} result
		 */
		doXPathOnDoc(expression, context, resultType)
		{
			return this.doc.evaluate(expression, context, nsResolver, resultType);
		}
        
    }  

	// preprocessing functions
	/**
	 * If a staff starts with clef and keySig, move it to the staffDef
	 * @param {DOMElement} staffElement 
	 * @param {Document} doc
	 */
	function tidyClefKeySig(staffElement, doc)
	{
		let staffNum = staffElement.getAttribute("n");
		let staffDef = doc.evaluate("//mei:staffDef[@n='"+staffNum+"']", doc.childNodes[0], nsResolver).iterateNext();
		if(doc.evaluate('./mei:layer/mei:clef', staffElement, nsResolver, 3).booleanValue &&
			doc.evaluate('count(./mei:layer/mei:clef[1]/preceding-sibling::mei:note)', staffElement, nsResolver).numberValue === 0)
		{
			let firstClef = staffElement.getElementsByTagName("clef")[0];
			staffDef.appendChild(firstClef);
		}
		
		if(doc.evaluate('./mei:layer/mei:keySig', staffElement, nsResolver, 3).booleanValue &&
			doc.evaluate('count(./mei:layer/mei:keySig[1]/preceding-sibling::mei:note)', staffElement, nsResolver).numberValue === 0)
		{
			let firstKeySig = staffElement.getElementsByTagName("keySig")[0];
			staffDef.appendChild(firstKeySig);
		}
	}


	/**
	 * Gather first mensuration of a staff as <mensur> child element of staffDef
	 * @param {DOMElement} staffElement 
	 * @param {Document} doc
	 */
	function putStartingMensToStaffDef(staffElement, doc)
	{
		let staffNum = staffElement.getAttribute("n");
		let staffDef = doc.evaluate("//mei:staffDef[@n='"+staffNum+"']", doc.childNodes[0], nsResolver).iterateNext();
		let mensAttrStartList = ["mensur.", "poport.", "tempus", "prolatio", "modusminor", "modusmaior"];

		if(doc.evaluate('./mei:layer/mei:mensur', staffElement, nsResolver, 3).booleanValue &&
			doc.evaluate('count(./mei:layer/mei:mensur[1]/preceding-sibling::mei:note)', staffElement, nsResolver).numberValue === 0)
		{
			let firstMensur = staffElement.getElementsByTagName("mensur")[0];
			staffDef.appendChild(firstMensur);
		}
		else if(doc.evaluate('./@tempus and ./@prolatio', staffDef, nsResolver, 3).booleanValue)
		{
			let mensur = doc.createElementNS(nsResolver("mei"), "mensur");
			let staffDefAttrs = staffDef.attributes;

			// because attributes get removed, start iterating from back to front
			for (let a = staffDefAttrs.length-1; a >= 0; a--)
			{
				let attr = staffDefAttrs[a];
				for (let listItem of mensAttrStartList)
				{
					if (attr.name.startsWith(listItem))
					{
						// "mensur." and "proport." needs to be removed within <mensur>
						// let's do some regex to cut everything to the dot
						let attrName = attr.name.replace(/^[\w+]*\./,'');
						mensur.setAttribute(attrName, attr.value);
						staffDef.removeAttribute(attr.name);
					}
				}
			}
			staffDef.appendChild(mensur);
		}
	}

	/**
	 * Should remove redundant ligature form and note lig attributes.
	 * For now, ligatures will be removed completely for better alignment
	 * @todo Remove just redundant visual attributes when Verovio rendering is properly done
	 * @param {DOMElement} staffElement 
	 */
	function removeLig(staffElement)
	{
		let layers = staffElement.getElementsByTagName("layer");
		for (let layer of layers)
		{
			let ligatures = layer.getElementsByTagName("ligature");
			for (let i = ligatures.length -1; i >= 0; i--)
			{
				let ligature = ligatures[i];
				for (let event of ligature.children)
				{
					// we create a copy to loop properly
					// counting backwards would cause more trouble 
					// when getting the order of the notes right
					let copyEvent = event.cloneNode(true);
					if(copyEvent.getAttribute("lig")) copyEvent.removeAttribute("lig");
					layer.insertBefore(copyEvent,ligature);
				}
				ligature.remove();
			}
		}
	}

	/**
	 * Adjacent <mensur> <proport> elements get merged into one <mensur> element
	 * (avoids misplacments in rendering)
	 * @param {DOMElement} staffElement 
	 */
	function mergeAdjacentMensProp(staffElement)
	{
		let mensuration = staffElement.getElementsByTagName("mensur");
		for (let mens of mensuration)
		{
			if (mens.nextElementSibling.tagName==="proport")
			{
				let prop = mens.nextElementSibling;
				mens.setAttribute("num",prop.getAttribute("num"));
				mens.setAttribute("numbase",prop.getAttribute("numbase"));
				prop.remove();
			}
		}
	}

    return MEIdoc;
  })();


