"use strict";

/** @var {URL} currentUrl current url */
var currentUrl = new URL(window.location.href);
/** @var baseUrl current base url */
var baseUrl = currentUrl.origin + currentUrl.pathname;
/** @var currentParams parameters of current url */
var currentParams = currentUrl.searchParams;
//var meiUrl;
/** @var {MEIdoc} meiFile contains the current used MEI document */
var meiFile = new MEIdoc();
/** @var {Boolean} basicAnalysisDone if basic analysis is done */
var basicAnalysisDone = false;
/** @var {Boolean} complexAnalysisDone if complex analysis is done */
var complexAnalysisDone = false;
/** @var {Boolean} instructor instructor mode */
var instructor = false;
/** @const {String} interpreter interpreter resp value */
const interpreter = "mensural-interpreter";
/** @const {String} intResp interpreter resp value */
const intResp = "#" + interpreter;

/** event that is currently shown in detail */
var shownEvent = null;
/** event preceding the currently shown event */
var prevEvent = null;
/** event that follows the currently shown event */
var nextEvent = null;

/**
 * Fetches an existing mei file from any url
 * @param {String} meiUrl 
 */
function fetchMEI(meiUrl) {
    if(meiUrl)
    {
        fetch(meiUrl)
        .then(function(response) {
            return response.text();
        })
        .then(function(text) {
            meiFile.text = text;
            loadData();
            checkIfAlreadyRun();
        });
    }
}

/**
 * Prints block data into a table and shows it within the blocks modal
 */
function getSectionBlocks() {
    if (meiFile.blocks.length > 0) {
        $("#blockCount").text(meiFile.blocks.length);
        $("#blockTableBody").empty();
        for(let i = 0; i < meiFile.blocks.length; i++) {
            let blockRow = $("<tr></tr>");
            blockRow.append(`<td>${i}</td>`);
            blockRow.append(`<td>${meiFile.blocks[i].part}</td>`);
            blockRow.append(`<td>${meiFile.blocks[i].mens ? makeXmlCode(meiFile.blocks[i].mens.outerHTML) : ''}</td>`);
            blockRow.append(`<td>${meiFile.blocks[i].prop ? makeXmlCode(meiFile.blocks[i].prop.outerHTML) : ''}</td>`);
            blockRow.append(`<td>${meiFile.blocks[i].prevPropMultiplier ? meiFile.blocks[i].prevPropMultiplier : ''}</td>`);
            blockRow.append(`<td>${meiFile.blocks[i].events.length}</td>`);
            blockRow.append(`<td>${meiFile.blocks[i].dur}</td>`);
            blockRow.append(`<td>${meiFile.blocks[i].totaldur}</td>`);
            $("#blockTableBody").append(blockRow);
        }

        $("#blocksInfo").modal('show');
    }
}

/**
 * Loads meiFile with Verovio and adds MEI blob to download button
 */
function loadData() {
    updateBlob();
    vrvInterface.loadData(meiFile.text);
}

/**
 * Updates the MEI blob and serve it
 */
function updateBlob() {
    meiFile.renewBlob();
    $("#download").attr("href", URL.createObjectURL(meiFile.blob));
}

/**
 * Wraps an xml string into \<code\> elements to display code highlighting
 * @param {String} htmlString 
 * @returns {String}
 */
function makeXmlCode(htmlString) {
    let ltString = htmlString.replace(/</gm,"&lt;");
    let gtString = ltString.replace(/>/gm, "&gt;");

    return `<code>${gtString}</code>`
}


/**
 * Shows event details of chosen element
 * @param {DOMObject} eventEl 
 */
    function showDetails(eventEl) {
    const formAttrs = ["dur.quality", "rule", "dur.metrical", "num", "numbase"];
    const additionalAttrs = ["defaultminims", "comment"];
    const positionAttrs = ["startsAt", "mensurBlockStartsAt", "beatPos", "onTheBreveBeat", "crossedABreveBeat"];

    const dtTag = "<dt class='col-4 text-truncate dyAttTerm' data-toggle='tooltip'></dt>";
    const ddTag = "<dd class='col-8 dyAttValue'></dd>";

    hideDetails();
    $(eventEl).addClass("selected");

    var thisID = $(eventEl).attr("id");
    var attributes;
    if(thisID) attributes = ioHandler.getPropertyByID(thisID, null, 0);
    if (attributes)
    {
        $("#additional").prop("hidden", true);
        for (let attr in attributes)
        {
            // retrieve Values for interpreter modification form
            if(formAttrs.indexOf(attr)!=-1)
            {
                //let attrMod = attr.replace(".","");
                let formID = "#" + attr.replace(".","") + "Interpreter";
                let formInputID = "#" + attr.replace(".","") + "User";
                /*if(typeof attributes[attr]==="string")
                {
                    $(formID).attr("placeholder",attributes[attr]);
                    $(formID).attr("title",attributes[attr]);
                }
                else
                {*/
                    $(formInputID).val(attributes[attr].user);
                    $(formID).attr("placeholder",attributes[attr].interpreter);
                    $(formID).attr("title",attributes[attr].inter);
                //}                
            }
            // beatPos is a readonly Extrawurst
            else if (attr==="beatPos")
            {
                var beatPosArray;
                var beatPosCorrArray;

                if(attributes[attr].sic === null)
                {
                    beatPosArray = attributes[attr].corr.split(", ");
                }
                else
                {
                    beatPosArray = attributes[attr].sic.split(", ");
                    beatPosCorrArray = attributes[attr].corr.split(", ");
                }

                for(let i = 0; i < beatPosArray.length; i++)
                {
                    let cellID = "#beatPos" + i;
                    $(cellID).text(beatPosArray[i]);

                    if(beatPosCorrArray!=null)
                    {
                        $(cellID).contents().wrap("<s></s>");
                        let corrID = "#beatPosCorr" + i;
                        $(corrID).append($("<strong></strong>").text(beatPosCorrArray[i]));
    
                    }
                }
                
            }
            // all other readonly attributes
            else
            {
                let dt = $(dtTag).text(attr);
                $(dt).attr("title",attr);
                let dd = $(ddTag);

                if (typeof attributes[attr] === "string")
                {
                    dd.text(attributes[attr]);
                }
                else if(attributes[attr].sic === null)
                {
                    dd.text(attributes[attr].corr);
                }
                else
                {
                    let sic = $("<s></s>").text(attributes[attr].sic);
                    let corr = $("<strong></strong>").text(attributes[attr].corr);

                    dd.append(sic);
                    dd.append(corr);
                }

                if(positionAttrs.indexOf(attr)!=-1)
                {
                    $("#posAttList").append(dt);
                    $("#posAttList").append(dd);
                }
                else if(attr!=="xml:id" && attr!=="type" && additionalAttrs.indexOf(attr)==-1)
                {
                    $("#attList").append(dt);
                    $("#attList").append(dd);
                }
                else if(additionalAttrs.indexOf(attr)!==-1)
                {
                    $("#addAttList").append(dt);
                    $("#addAttList").append(dd);
                    $("#additional").prop("hidden", false);
                }
            }
        }
        
        shownEvent = eventEl;
        nextEvent = $(eventEl).next();
        prevEvent = $(eventEl).prev();

        $("#basic").prop("hidden", false);
        if(basicAnalysisDone || instructor) $("#interpreterResult").prop("hidden", false);
        if(basicAnalysisDone) $("#positions").prop("hidden", false);
        if(instructor && basicAnalysisDone) $("#submitFeedback").prop('disabled', true);
        $("#hideInfo").prop("disabled", false);
        $("#hideInfo").click(function() {
            hideDetails();
        });
    }
}

/**
 * Remove details of the currently shown event
 */
function hideDetails() {
    //const killRed = "[fill='" + red + "']";
    $(".selected").removeClass("selected");
    shownEvent = null;
    nextEvent = null;
    prevEvent = null;
    $("#hideInfo").prop("disabled", true);
    $("#basic").prop("hidden", true);
    $("#interpreterResult").prop("hidden", true);
    $(".dyAttTerm, .dyAttValue").remove();
    $(".dyValueContainer").empty();
    $(".dyValuePlaceholder").attr("placeholder","");
    $(".interpreterInput").val("");
}

/**
 * Checks if the current file has already been modified by the interpreter
 */
function checkIfAlreadyRun() {
    var change = meiFile.doXPathOnDoc("//mei:change[@resp='" + intResp + "']", meiFile.doc, 3).booleanValue;
    if(change)
    {
        basicAnalysisDone = true;
        complexAnalysisDone = true;
        $("#beatIndependent").prop('disabled', true);
        $("#complexBeatAnalysis").prop('disabled', true);
    }
    else
    {
        basicAnalysisDone = false;
        complexAnalysisDone = false;
        $("#beatIndependent").prop('disabled', false);
        $("#complexBeatAnalysis").prop('disabled', false);
    }
}

/**
 * Evaluates the differences of user feed and interpreter and adds a type to events:
 * * correct: the user inserted a value that wasn't changed by the interpreter
 * * wrongRule: only rule has been changed by the interpreter
 * * wrong: Values other than rule differ or a modification has not been set by the user
 * Events without modification and no user feed at all stay black!
 */
function evaluateResults(){
    for (let [key, value] of Object.entries(meiFile.annotations))
    {
        let event = meiFile.eventDict[key];
        // check if there are choices
        if(meiFile.doXPathOnDoc("./mei:annot[mei:choice]", value, 3).booleanValue === false)
        {
            if(meiFile.doXPathOnDoc("count(./mei:annot/@resp[.!='" + intResp + "'])", value, 1).numberValue >= 1)
            {
                // a non-interpreter-resp within annot must be correct
                event.setAttribute("type", "correct");
            }
            else if(meiFile.doXPathOnDoc("./mei:annot[(@type='dur.quality' or @type='num' or @type='numbase') and @resp='" + intResp + "']", value, 3).booleanValue)
            {
                // a quality that has not been entered by the user is wrong
                event.setAttribute("type", "wrong");
            }
        }
        else
        {
            // collect all choices
            let choiceAnnots = meiFile.doXPathOnDoc("./mei:annot[mei:choice]/@type", value, 6);
            let choices = [];
            let userValues = ["dur.quality", "num", "numbase", "rule", "dur.metrical"];
        
            // build an array with annot types that contain choices
            for(let i=0; i < choiceAnnots.snapshotLength; i++)
            {
                let propWithChoice = choiceAnnots.snapshotItem(i).value;
                if(userValues.indexOf(propWithChoice)>=0)
                {
                    choices.push(propWithChoice);
                }
            }
            // don't evaluate elements without any choices
            if(choices.length>0)
            {
                // As only cases with more than 0 choices are observed,
                // there is only one possibilty for a wrong rule
                // everything else at this point must be wrong
                if(choices.length===1 && choices[0]==="rule")
                {
                    event.setAttribute("type", "wrongRule");
                }
                else
                {
                    event.setAttribute("type", "wrong");
                }
            }
        }
    }
}

/**
 * Adds types to modified notes to allow color coding.
 * Only used in instructor mode.
 */
function highlightQualities(){
    for (let [key, value] of Object.entries(meiFile.annotations))
    {
        let event = meiFile.eventDict[key];
        let quality;
        let eventType = event.getAttribute("type");

        if(event.getAttribute("dur.quality") != null)
        {
            quality = event.getAttribute("dur.quality");
        }
        else if(event.getAttribute("num") != null && event.getAttribute("numbase") != null)
        {
            if(meiFile.doXPathOnDoc("./mei:annot[@type='rule']/text()='simpleDot'", value, 3).booleanValue)
            {
                quality = "simpleDot";
            }
            else
            {
                quality = "non-standard";
            }
        }

        if(quality)
        {
            // type is used for coloring, therefore only one type is relevant, replace type
            event.setAttribute("type", quality);

            /*if(eventType != null)
            {
                event.setAttribute("type", eventType + " " + quality);
            }
            else
            {
                event.setAttribute("type", quality);
            }*/
        }
    }
}

$(document).ready(function(){

    var meiUrl = currentParams.get("url");
    
    // toggle instructor mode by url param
    instructor = currentParams.get("mode")==="instructor" ? true : false;

    if(meiUrl) 
    {
        fetchMEI(meiUrl);
    }
    
    // fancy file input animation
    bsCustomFileInput.init()   

    $("#customFile").change(function() {
        let meiBlob = this.files[0];

        var reader = new FileReader();
        reader.readAsText(meiBlob);

        reader.onload = function(event) {
            meiFile.text = event.target.result;
            currentParams.set("url", null);
            window.history.pushState({}, "Mensural interpreter", `${baseUrl}`);
            loadData();
            checkIfAlreadyRun();
        };    
    });

    $("#btnResetFile").click(function() {
        $("#fileInput")[0].reset();
        $("#elementInfo").empty();
    });
    
    $("#load").click(function() {
        let input = $("#url").val();
        currentParams.set("url", input);
        location.replace(`${baseUrl}?${currentParams}`);
        $("#elementInfo").empty();
        return false;
    });

    $("#blockify").click(function() {
        getSectionBlocks();
    });

    $("#beatIndependent").click(function() {
        if (basicAnalysisDone===false)
        {
            basic.beatIndependentDurations(meiFile);
            startTimes.addStartTimes(meiFile);
            post.run(meiFile);
            basicAnalysisDone = true;
            $("#beatIndependent").prop('disabled', true);
            loadData();
        }
    });

    $("#complexBeatAnalysis").click(function() {
        if(basicAnalysisDone===false)
        {
            basic.beatIndependentDurations(meiFile);
            startTimes.addStartTimes(meiFile);
            basicAnalysisDone = true;
            $("#beatIndependent").prop('disabled', true);
        }

        if(basicAnalysisDone===true && complexAnalysisDone===false)
        {
            complexBeats.complexAnalysis(meiFile);
            post.run(meiFile);
            if(instructor===true)
            {
                evaluateResults();
            }
            else
            {
                highlightQualities();
            }
            loadData();
            complexAnalysisDone = true;
            $("#complexBeatAnalysis").prop('disabled', true);
        }
    });

    $("#vrvForw").click(function() {
        vrvInterface.nextPage();
    });
    $("#vrvBack").click(function() {
        vrvInterface.prevPage();
    });

    $("#vrvZoomIn").click(function() {
        vrvInterface.zoomIn();
    });

    $("#vrvZoomOut").click(function() {
        vrvInterface.zoomOut();
    });

    $("#submitFeedback").click(function() {
        let usrInput = {
            "dur.quality" : $("#durqualityUser").val(),
            "rule" : $("#ruleUser").val(),
            "num" : $("#numUser").val(),
            "numbase": $("#numbaseUser").val(),
            "dur.metrical" : $("#durmetricalUser").val(),
            "resp.name" : $("#userName").val(),
            "resp.initials" : $("#userInitials").val()
        };

        //make empty strings null
        for (let prop in usrInput)
        {
            if(usrInput[prop] === '') usrInput[prop] = null;
        }

        ioHandler.submitFeedback(usrInput, $(shownEvent).attr("id"));
        
        // calculate corrected startTimes (not useful in instructor mode)
        if(instructor===false)
        {
            startTimes.addStartTimes(meiFile);
        }

        //updateBlob();
        loadData();
        
    });

    $(window).resize(function(){
        vrvInterface.applyZoom();
    });

});
