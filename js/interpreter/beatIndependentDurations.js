/** @fileoverview Contains functionality to analyse durations that aren't dependant on any beat positions. */
"use strict";

/** 
 * @namespace basic
 * @desc Contains functionality to analyse durations that aren't dependant on any beat positions.
 */

var basic = (function() {

	/**
	 * Since rests can't be altered or imperfected, all rests can be
	 * resolved immediately
	 * @param {Array} sectionBlocks Array of all the coherent areas of
     * mensurations in a section
	 * @memberof basic
	 * @inner
	 */
	function labelRests(sectionBlocks){
		for(var b=0; b<sectionBlocks.length; b++)
		{
			var mens = sectionBlocks[b].mens;
			for(var e=0; e<sectionBlocks[b].events.length; e++)
			{
				var event = sectionBlocks[b].events[e];
				if(rm.isRest(event))
				{
					var augmentedDot = e+1<sectionBlocks[b].events.length
							&& rm.augDot(sectionBlocks[b].events[e+1]);
					//durIO.writeDur(rm.simpleMinims(event, mens, 0), event, augmentedDot);
					//event.setAttributeNS(null, 'rule', 'rest');
					durIO.writeDurWithRule(event, mens, 'rest', augmentedDot);
				}
			}
		}
	}

	/**
	 * Colored notation is assumed to be simple duple and labelled accordingly
	 * @todo Take minor color into account?
	 * @param {Array} sectionBlocks Array of all the coherent areas of
     * mensurations in a section
	 * @memberof basic
	 * @inner
	 */
	function actOnColoration(sectionBlocks){
		for(var b=0; b<sectionBlocks.length; b++)
		{
			var mens = sectionBlocks[b].mens;
			for(var e=0; e<sectionBlocks[b].events.length; e++)
			{
				var event = sectionBlocks[b].events[e];
				if(rm.isNote(event) && rm.isColored(event))
				{
					var augmentedDot = e+1<sectionBlocks[b].events.length
							&& rm.augDot(sectionBlocks[b].events[e+1]);
					//durIO.writeDur(rm.simpleMinims(event, mens) * 2/3, event, augmentedDot);
					//event.setAttributeNS(null, 'rule', 'coloration');
					durIO.writeDurWithRule(event, mens, 'coloration', augmentedDot, 2, 3);
				}
			}
		}
	}

	/**
	 * Simple processing of dots of augmentation (other dots ignored)
	 * @param {Array} sectionBlocks Array of all the coherent areas of
     * mensurations in a section
	 * @memberof basic
	 * @inner
	 */
	function actOnDots(sectionBlocks){
		for(var b=0; b<sectionBlocks.length; b++){
			var mens = sectionBlocks[b].mens;
			for(var e=0; e<sectionBlocks[b].events.length; e++){
				var event = sectionBlocks[b].events[e];
				if(rm.augDot(event) && e){
					var prev = sectionBlocks[b].events[e-1];
					if(e && !durIO.readDur(prev))
						if(rm.notePerfectAsWhole(prev, mens)){
							durIO.writePerfection(prev, mens,'I.2.a.PerfDot');
						} else {
							durIO.writeDurWithRule(prev, mens, 'simpleDot', true);
						}
				}
			}
		}
	}

	/**
	 * Resolves durations for any note that is not regularly perfect and
	 * that is not a direct part of a ternary note (so isn't alterable).
	 * @param {Array} sectionBlocks Array of all the coherent areas of
     * mensurations in a section
	 * @memberof basic
	 * @inner
	 */
	function allUnalterableImperfectLevels(sectionBlocks){
		// Anything imperfect and with an imperfect next longer note is trivial
		for(var b=0; b<sectionBlocks.length; b++){
			var mens = sectionBlocks[b].mens;
			//var menssum = rm.mensurSummary(mens);
			//var alterableLevels = [2, 2, 2].concat(menssum).concat([2]);
			//var firstPerf = rm.firstPerfectLevel(mens);
			for(var e=0; e<sectionBlocks[b].events.length; e++){
				var event = sectionBlocks[b].events[e];
				if(rm.isNote(event) && !durIO.readDur(event)){
					//var level = rm.noteInt(event);
					if(!rm.notePerfectAsWhole(event, mens) && !rm.isAlterable(event, mens))
					{
						// Assume that actOnDots has already been run on all dotted notes
						durIO.writeDurWithRule(event, mens, 'unalterableImperfect');
						//durIO.writeDur(rm.simpleMinims(event, mens), event, false);
					}
				}
			}
		}
	}

	/**
	 * Resolves any alterations that can be treated as simple local note
	 * patterns
	 * Rule A.1 requires us to know the mensural position of the note,
	 * so we can't resolve that yet, but we can rule out things that
	 * won't work, and we can apply rule A.2:
	 * An alterable note that is preceded by a larger note followed by
	 * the equivalent of its own regular value and followed by a note
	 * or rest of the perfect unit next larger is altered.
	 * @param {Array} sectionBlocks Array of all the coherent areas of
     * mensurations in a section
	 * @memberof basic
	 * @inner
	 *
	 */ 
	function simplestAlterations(sectionBlocks){
		for(var b=0; b<sectionBlocks.length; b++){
			var events = sectionBlocks[b].events;
			var mens = sectionBlocks[b].mens;
			var menssum = rm.mensurSummary(mens);
			//var alterableLevels = [2, 2, 2].concat(menssum).concat([2]);
			var perfectLevels = [2, 2, 2, 2].concat(menssum);
			for(var e=0; e<events.length; e++){
				var event = events[e];
				if(rm.isNote(event) && !durIO.readDur(event)){
					var level = rm.noteInt(event);
					if(rm.isAlterable(event, mens)){
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
										&& rm.augDot(sectionBlocks[b].events[e+1]);
								durIO.writeDurWithRule(event, mens, 'unalteredImperfectAfterLarger', augmentedDot);
							}
							for(let i=e-1; i>=0; i--){
								if(!durIO.readDur(events[i])){
									break;
								}
								target = durIO.readDur(events[i]);
								if(target===0){
									if(i===0 || rm.noteInt(events[i-1])>level
										|| rm.divisionDot(events[i-1])){
										// Yay, it's an alteration
										durIO.writeAlteration(event, mens, "A.2b");
										//durIO.writeDur(2 * rm.simpleMinims(event, mens), event, false);
										//event.setAttributeNS(null, 'quality', 'a');
										//event.setAttributeNS(null, 'rule', 'A.2b');
									}
									break;
								} else if(target<0){
									// A.2 doesn't apply
									break;
								} 
							}
						} 
						else if(perfectLevels[level]===2)
						{
							// Now we can resolve this rhythm
							var augmentedDot = e+1<sectionBlocks[b].events.length
									&& rm.augDot(sectionBlocks[b].events[e+1]);
							durIO.writeDurWithRule(event, mens, 'unalteredImperfect', augmentedDot);
						}
					}
				}
			}
		}
	}

	/**
	 * If a note is followed immediately by a note or rest at the same
	 * level, the former cannot be imperfected. Such
	 * notes can have duration labelled immediately.
	 * @see leveleq
	 * @param {Array} sectionBlocks Array of all the coherent areas of
     * mensurations in a section
	 * @memberof basic
	 * @inner
	 */
	function anteSim(sectionBlocks){
		for(var b=0; b<sectionBlocks.length; b++){
			var mens = sectionBlocks[b].mens;
			for(var e=0; e<sectionBlocks[b].events.length; e++){
				var event = sectionBlocks[b].events[e];
				if(rm.isNote(event) && !durIO.readDur(event)
					&& rm.regularlyPerfect(event, mens)
					&& (e+1)<sectionBlocks[b].events.length
					&& rm.noteOrRest(sectionBlocks[b].events[e+1])
					&& rm.leveleq(sectionBlocks[b].events[e+1], event))
				{
					//durIO.writeDur(rm.simpleMinims(event, mens), event, false);
					//event.setAttributeNS(null, 'rule', 'I.2.b.antesim');
					durIO.writePerfection(event, mens, 'I.2.b.antesim');
				}
			}
		}
	}

	return {
		/** 
		 * Runs resolution steps that aren't dependant on any rhythms or beat
		 * positions already having been solved. These are: rests (which can't
		 * be altered or imperfected anyway); coloration; dots of
		 * augmentation; notes below the first perfect/alterable level;
		 * trivial alterations (based on pattern, not beat position); ante
		 * simile.
		 * @param {MEIdoc} meiDoc mei document
		 * @memberof basic
		 */
		beatIndependentDurations : function(meiDoc) {
			var sectionBlocks = meiDoc.blocks;

			labelRests(sectionBlocks);
			actOnColoration(sectionBlocks);
			actOnDots(sectionBlocks);
			allUnalterableImperfectLevels(sectionBlocks);
			simplestAlterations(sectionBlocks);
			anteSim(sectionBlocks);

			// write dur.ges => dur.intermediate * propMultiplier
			//durIO.setDurGesPerBlock(sectionBlocks);
		}
	}

})();

