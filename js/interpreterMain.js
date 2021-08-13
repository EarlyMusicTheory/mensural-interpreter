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


/** Bootstrap blue to highlight events */
const blue = "#007bff";
/** Bootstrap red to highlight events */
const red = "#dc3545";


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
    $(eventEl).attr("fill", red);

    let thisID = $(eventEl).attr("id");
    let attributes = ioHandler.getPropertyByID(thisID, null, true);
    if (attributes)
    {
        for (let attr in attributes)
        {
            // retrieve Values for interpreter modification form
            if(formAttrs.indexOf(attr)!=-1)
            {
                //let attrMod = attr.replace(".","");
                let formID = "#" + attr.replace(".","") + "Output";
                let formInputID = "#" + attr.replace(".","") + "Input";
                if(typeof attributes[attr]==="string")
                {
                    $(formID).attr("placeholder",attributes[attr]);
                    $(formID).attr("title",attributes[attr]);
                }
                else
                {
                    $(formInputID).val(attributes[attr].corr);
                    $(formID).attr("placeholder",attributes[attr].sic);
                    $(formID).attr("title",attributes[attr].sic);
                }                
            }
            // beatPos is a readonly Extrawurst
            else if (attr==="beatPos")
            {
                var beatPosArray;
                var beatPosCorrArray;

                if(typeof attributes[attr] === "string")
                {
                    beatPosArray = attributes[attr].split(", ");
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

                if(typeof attributes[attr] === "string")
                {
                    dd.text(attributes[attr]);
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
                else if(attr!=="xml:id" && additionalAttrs.indexOf(attr)==-1)
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
        if(basicAnalysisDone) $("#interpreterResult").prop("hidden", false);
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
    const killRed = "[fill='" + red + "']";
    $(killRed).removeAttr("fill");
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

function checkIfAlreadyRun() {
    var change = meiFile.doXPathOnDoc("//mei:change[@resp='#mensural-interpreter']", meiFile.doc, 3).booleanValue;
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


$(document).ready(function(){

    var meiUrl = currentParams.get("url");
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
            "dur.quality" : $("#durqualityInput").val(),
            "rule" : $("#ruleInput").val(),
            "num" : $("#numInput").val(),
            "numbase": $("#numbaseInput").val(),
            "dur.metrical" : $("#durmetricalInput").val(),
            "resp.name" : $("#userName").val(),
            "resp.initials" : $("#userInitials").val()
        };

        //make empty strings null
        for (let prop in usrInput)
        {
            if(usrInput[prop] === '') usrInput[prop] = null;
        }

        ioHandler.submitFeedback(usrInput, $(shownEvent).attr("id"));
        
        // calculate corrected startTimes
        startTimes.addStartTimes(meiFile);

        //updateBlob();
        loadData();
        
    });

    $(window).resize(function(){
        vrvInterface.applyZoom();
    });

});
