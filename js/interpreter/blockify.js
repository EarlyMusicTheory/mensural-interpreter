/** @fileoverview Contains the functionality to create sectionBlocks from a provided MEI file */
"use strict";

/** @module interpreter/blockifier */
var blockifier = (function() {
	/** private */
		
	/** @type {Object.<string,Object>} Key: ID of note or dot; Value: block
	 * @private
	 */
	var idDictionary = {};

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
	 * @param {DOMObject} doc The parent MEI doc tree
	 * @param {Object} prevMens The last mensuration of the previous block
	 * (this is the default for the first section of hte new block in some
	 * cases, if none is specified).
	 * @return {Array[block]} Array of mensurally coherent blocks
	 */
	function getEventsByMensurationForSection(section, doc, prevMens){
		if(doc.createNodeIterator){
			var ni = doc.createNodeIterator(section, NodeFilter.SHOW_ALL);
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
						block = {mens:block.mens, prop:next, events: foo};
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
					idDictionary[next.getAttributeNS(null, "id")] = block;
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

	/** public */
	return {
		/** Extracts blocks of mensurally coherent from an MEI document
		* @function
		* @param {DOMObject} MEIDoc document tree
		* @return {Array[block]} Array of mensurally coherent blocks containing block objects
		*/
		getBlocksFromSections : function (MEIDoc){
			var sections = getAtomicSections(MEIDoc);
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
					MEIDoc, 
					sectionBlocks.length > 0 ? sectionBlocks[sectionBlocks.length - 1].mens : false);
				//layerMens[i] = layerBlocks[layerBlocks.length - 1].mens;
				layerBlocks.forEach(lBlocks => sectionBlocks.push(lBlocks));
			}

			return sectionBlocks;
		}
	}
})();

