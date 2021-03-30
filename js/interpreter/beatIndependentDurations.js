/** @fileoverview Contains functionality to analyse durations that aren't dependant on any beat positions. */
"use strict";

/** @module interpreter/beatIndependentDurations */

/**
 * Available functions:
 * * labelRests
 * * actOnColoration
 * * actOnDots
 * * allUnalterableImperfectLevels
 * * simplestAlterations
 * * anteSim
 * 
 *  Uses: 
 *  * writeDur
 *  * readDur
 *  * augDot
 *  * notePerfectAsWhole
 *  * mensurSummary
 *  * firstPerfectLevel
 *  * simpleMinims
 *  * noteInt
 *  * regularlyPerfect
 *  * leveleq
 */

var beatIndependentDurations = (function() {
	/**
	 * Since rests can't be altered or imperfected, all rests can be
	 * resolved immediately
	 * @param {MEIdoc} meiDoc 
	 */
	function labelRests(meiDoc){
		var sectionBlocks = meiDoc.blocks;
		for(var b=0; b<sectionBlocks.length; b++){
			var mens = sectionBlocks[b].mens;
			var propMultiplier = meiDoc.proportionMultiplier(b);
			for(var e=0; e<sectionBlocks[b].events.length; e++){
				var event = sectionBlocks[b].events[e];
				if(event.tagName==='rest'){
					var augmentedDot = e+1<sectionBlocks[b].events.length
							&& sectionBlocks[b].events[e+1].tagName==="dot"
							&& sectionBlocks[b].events[e+1].getAttributeNS(null, 'form')==='aug';
					durIO.writeDur(rm.simpleMinims(event, mens, 0), event, augmentedDot, propMultiplier);
					event.setAttributeNS(null, 'rule', 'rest');
				}
			}
		}
	}

	/**
	 * @private
	 * Colored notation is assumed to be simple duple and labelled accordingly
	 * @param {MEIdoc} meiDoc 
	 */
	function actOnColoration(meiDoc){
		var sectionBlocks = meiDoc.blocks;
		for(var b=0; b<sectionBlocks.length; b++){
			var mens = sectionBlocks[b].mens;
			var propMultiplier = meiDoc.proportionMultiplier(b);
			for(var e=0; e<sectionBlocks[b].events.length; e++){
				var event = sectionBlocks[b].events[e];
				if(event.tagName==='note' && event.getAttributeNS(null, 'colored')){
					var augmentedDot = e+1<sectionBlocks[b].events.length
							&& sectionBlocks[b].events[e+1].tagName==="dot"
							&& sectionBlocks[b].events[e+1].getAttributeNS(null, 'form')==='aug';
					durIO.writeDur(rm.simpleMinims(event, mens) * 2/3, event, augmentedDot, propMultiplier);
					event.setAttributeNS(null, 'rule', 'coloration');
				}
			}
		}
	}

	/**
	 * @private
	 * Simple processing of dots of augmentation (other dots ignored
	 * @param {MEIdoc} meiDoc 
	 */
	function actOnDots(meiDoc){
		var sectionBlocks = meiDoc.blocks;
		for(var b=0; b<sectionBlocks.length; b++){
			var mens = sectionBlocks[b].mens;
			var propMultiplier = meiDoc.proportionMultiplier(b);
			for(var e=0; e<sectionBlocks[b].events.length; e++){
				var event = sectionBlocks[b].events[e];
				if(rm.augDot(event) && e){
					var prev = sectionBlocks[b].events[e-1];
					if(e && !prev.getAttributeNS(null, 'dur.ges'))
						if(rm.notePerfectAsWhole(prev, mens)){
							durIO.writeDur(rm.simpleMinims(prev, mens), prev, propMultiplier);
							prev.setAttributeNS(null, 'quality', 'p');
							prev.setAttributeNS(null, 'rule', 'I.2.a.PerfDot');
						} else {
							durIO.writeDur(rm.simpleMinims(prev, mens), prev, true, propMultiplier);
							prev.setAttributeNS(null, 'rule', 'simpleDot');
						}
				}
			}
		}
	}

	/**
	 * @private
	 * Resolves durations for any note that is not regularly perfect and
	 * that is not a direct part of a ternary note (so isn't alterable).
	 * @param {MEIdoc} meiDoc
	 */
	function allUnalterableImperfectLevels(meiDoc){
		var sectionBlocks = meiDoc.blocks;
		// Anything imperfect and with an imperfect next longer note is trivial
		for(var b=0; b<sectionBlocks.length; b++){
			var mens = sectionBlocks[b].mens;
			var propMultiplier = meiDoc.proportionMultiplier(b);
			var menssum = rm.mensurSummary(mens);
			var alterableLevels = [2, 2, 2].concat(menssum).concat([2]);
			var firstPerf = rm.firstPerfectLevel(mens);
			for(var e=0; e<sectionBlocks[b].events.length; e++){
				var event = sectionBlocks[b].events[e];
				if(event.tagName==='note' && !(event.getAttributeNS(null, 'dur.ges'))){
					var level = rm.noteInt(event);
					if(level < firstPerf && alterableLevels[level]===2){
						// Assume that actOnDots has already been run on all dotted notes
						durIO.writeDur(rm.simpleMinims(event, mens), event, false, propMultiplier);
					}
				}
			}
		}
	}

	/**
	 * @private
	 * Resolves any alterations that can be treated as simple local note
	 * patterns
	 * Rule A.1 requires us to know the mensural position of the note,
	 * so we can't resolve that yet, but we can rule out things that
	 * won't work, and we can apply rule A.2:
	 * An alterable note that is preceded by a larger note followed by
	 * the equivalent of its own regular value and followed by a note
	 * or rest of the perfect unit next larger is altered.
	 * @param {MEIdoc} meiDoc 
	 *
	 */ 
	function simplestAlterations(meiDoc){
		var sectionBlocks = meiDoc.blocks;
		for(var b=0; b<sectionBlocks.length; b++){
			var events = sectionBlocks[b].events;
			var mens = sectionBlocks[b].mens;
			var propMultiplier = meiDoc.proportionMultiplier(b);
			var menssum = rm.mensurSummary(mens);
			var alterableLevels = [2, 2, 2].concat(menssum).concat([2]);
			var perfectLevels = [2, 2, 2, 2].concat(menssum);
			for(var e=0; e<events.length; e++){
				var event = events[e];
				if(event.tagName==='note' && !(event.getAttributeNS(null, 'dur.ges'))){
					var level = rm.noteInt(event);
					if(alterableLevels[level]===3){
						// The level is alterable.
						// The next note must be the next level up
						if(e<events.length-1 && rm.noteInt(events[e+1])==level+1){
							// These are the only things that can be altered all.
							///For A.2 to be true, we need to count backwards by one
							// unit (assuming we have all the necessary dur.ges values;
							var target = rm.simpleMinims(event, mens);
							if((e==0 || rm.noteInt(events[e-1])>level) && perfectLevels[level]===2){
								// highly unlikely to be an alteration (would require
								// syncopation), not possible to be imperfected
								var augmentedDot = e+1<sectionBlocks[b].events.length
										&& sectionBlocks[b].events[e+1].tagName==="dot"
										&& sectionBlocks[b].events[e+1].getAttributeNS(null, 'form')==='aug';
								durIO.writeDur(rm.simpleMinims(event, mens), event, augmentedDot, propMultiplier);
							}
							for(let i=e-1; i>=0; i--){
								if(!events[i].getAttributeNS(null, 'dur.ges')){
									break;
								}
								target = durIO.readDur(events[i]);
								if(target===0){
									if(i===0 || rm.noteInt(events[i-1])>level
										|| (events[i-1].tagName=='dot' && events[i-1].getAttributeNS('form')!=='aug')){
										// Yay, it's an alteration
										durIO.writeDur(2 * rm.simpleMinims(event, mens), event, false, propMultiplier);
										event.setAttributeNS(null, 'quality', 'a');
										event.setAttributeNS(null, 'rule', 'A.2b');
									}
									break;
								} else if(target<0){
									// A.2 doesn't apply
									break;
								} 
							}
						} else if(perfectLevels[level]===2){
							// Now we can resolve this rhythm
							var augmentedDot = e+1<sectionBlocks[b].events.length
									&& sectionBlocks[b].events[e+1].tagName==="dot"
									&& sectionBlocks[b].events[e+1].getAttributeNS(null, 'form')==='aug';
							durIO.writeDur(rm.simpleMinims(event, mens), event, augmentedDot, propMultiplier);
						}
					}
				}
			}
		}
	}

	/**
	 * @private
	 * If a note is followed immediately by a note or rest at the same
	 * level, the former cannot be imperfected. Such
	 * notes can have duration labelled immediately.
	 * @see leveleq
	 * @param {MEIdoc} meiDoc
	 */
	function anteSim(meiDoc){
		var sectionBlocks = meiDoc.blocks;
		for(var b=0; b<sectionBlocks.length; b++){
			var mens = sectionBlocks[b].mens;
			var propMultiplier = meiDoc.proportionMultiplier(b);
			for(var e=0; e<sectionBlocks[b].events.length; e++){
				var event = sectionBlocks[b].events[e];
				if(event.tagName==="note" && !event.getAttributeNS(null, 'dur.ges')
					&& rm.regularlyPerfect(event, mens)
					&& (e+1)<sectionBlocks[b].events.length
					// && (sectionBlocks[b].events[e+1].tagName==='note')// Surely note or rest?
					&& (sectionBlocks[b].events[e+1].tagName==='note' || sectionBlocks[b].events[e+1].tagName==='rest')
					&& durIO.leveleq(sectionBlocks[b].events[e+1], event)){
					durIO.writeDur(rm.simpleMinims(event, mens), event, false, propMultiplier);
					event.setAttributeNS(null, 'rule', 'I.2.b.antesim');
				}
			}
		}
	}

	return {
		/** 
		 * @public
		 * Runs resolution steps that aren't dependant on any rhythms or beat
		 * positions already having been solved. These are: rests (which can't
		 * be altered or imperfected anyway); coloration; dots of
		 * augmentation; notes below the first perfect/alterable level;
		 * trivial alterations (based on pattern, not beat position); ante
		 * simile.
		 *
		 * @param {MEIdoc} meiDoc mei document
		 */
		beatIndependentDurations : function(meiDoc) {
			labelRests(meiDoc);
			actOnColoration(meiDoc);
			actOnDots(meiDoc);
			allUnalterableImperfectLevels(meiDoc);
			simplestAlterations(meiDoc);
			anteSim(meiDoc);
		}
	}

})();
