"use strict";

/**
 * @fileoverview This file contains the MEIdoc class
 * 
 * Trying to fake some kind of private scope for the class.
 * Used https://blog.bitsrc.io/doing-it-right-private-class-properties-in-javascript-cc74ef88682e
 */

var MEIdoc = (() => {
    const parser = new DOMParser();
    const serializer = new XMLSerializer();

	/**
	 * Return all the sections that themselves contain no sections (we
	 * have a hierarchical tree structure for parts, so this only chooses
	 * the lowest level structural unit.
	 * @private
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
	 * @return {Array[block]} Array of mensurally coherent blocks
	 */
	function getEventsByMensurationForSection(section, meiDoc, prevMens){
		if(meiDoc.doc.createNodeIterator){
			var ni = meiDoc.doc.createNodeIterator(section, NodeFilter.SHOW_ALL);
			var next = ni.nextNode();
		} else {
			var bucket = section.getElementsByTagName('*');
			var pointer = 0;
			var next = bucket[pointer];
		}
		var foo = [];
		var block = {mens: prevMens, events: foo, prevPropMultiplier: 1};
		var blocks = [block];
		while(next){
			switch(next.tagName){
				case 'mensur':
					if(foo.length){
						foo = [];
						block = {mens:next, events: foo};
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
						block = {mens:block.mens, 
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
						if(next.getAttributeNS(null, 'dur')==='maxima'){
							if(next.getAttributeNS(null, 'maximaIsPerfect')==='true') block.mens.setAttributeNS(null, 'modusmaior', 3);
							if(next.getAttributeNS(null, 'longaIsPerfect')==='true') block.mens.setAttributeNS(null, 'modusminor', 3);
						} else if (next.getAttributeNS(null, 'dur')==='longa' && next.getAttributeNS(null, 'quality')=="p"){
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
		mei: "http://www.music-encoding.org/ns/mei"
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
     * @member {string} text
     * @member {DOMObject} doc
	 * @member {Blob} blob
     * @member {Array} blocks
     * @member {Object.<string,Object>} idDictionary return block by event id
     * @method appendToIdDictionary
     * @method getBlocksFromSections
     */
    class MEIdoc {
        constructor(meiText) {
            this.meiDoc = meiText ? parser.parseFromString(meiText, "text/xml") : null;
			this.idDict = {};
			this.eventIdDict = {};
            this.sectionBlocks;
			this.meiBlob = this.meiDoc ? new Blob([this.text], {type: 'text/xml'}) : null;
			if(this.doc) this.initEventDict();
			if(this.doc) this.getBlocksFromSections();
        }

        get text() {
            return this.doc ? serializer.serializeToString(this.doc) : null;
        }
        set text(meiText) {
            this.doc = parser.parseFromString(meiText, "text/xml");
			if (this.doc) this.getBlocksFromSections();
        }

        get doc() {
            return this.meiDoc ? this.meiDoc : null;
        }
        set doc(meiDocTree) {
            this.meiDoc = meiDocTree;
			if(this.meiDoc) this.getBlocksFromSections();
			if(this.meiDoc) this.meiBlob = new Blob([this.text], {type: 'text/xml'});
			if(this.meiDoc) this.initEventDict();
        }

		get blob() {
			return this.meiBlob;
		}
		renewBlob() {
			this.meiBlob = new Blob([this.text], {type: 'text/xml'});
		}

        get blocks() {
            return this.sectionBlocks;
        }
        set blocks(blockArray) {
            this.sectionBlocks = blockArray;
        }

        get idDictionary() {
            return this.idDict;
        }
        set idDictionary(idDictObj) {
            this.idDict = idDictObj;
        }
        appendToIdDictionary(id, block) {
            this.idDict[id] = block;
        }
        getBlockByEventId(eventId) {
            return this.idDictionary[eventId];
        }

		get eventDict () {
			return this.eventIdDict;
		}
		initEventDict()  {
			var bucket = this.doc.getElementsByTagName('*');
			for (let element of bucket)
			{
				let id = element.getAttribute("xml:id");
				if (id != null) this.eventIdDict[id] = element;
			}
		}
        
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

			for (let i of layers)
			{
				let layerBlocks = getEventsByMensurationForSection(i, 
					this, 
					sectionBlocks.length > 0 ? sectionBlocks[sectionBlocks.length - 1].mens : false);
				//layerMens[i] = layerBlocks[layerBlocks.length - 1].mens;
				layerBlocks.forEach(lBlocks => sectionBlocks.push(lBlocks));
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
		 * Preprocesses MEI file as a matter or normalization
		 * * merge adjacent <mensur> and <proport> into <mensur> (to keep them together and avoid Verovio strangeness?)
		 * * put first <clef> and <keySig> into <staffDef>
		 * * delete empty <dir>
		 * * delete empty <verse>
		 * * delete note/@lig if it is identical to ligature/@form
		 */
		preprocess(){

		}
        
    }  
    return MEIdoc;
  })();


