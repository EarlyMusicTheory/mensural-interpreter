"use strict";

var currentUrl = new URL(window.location.href);
var baseUrl = currentUrl.origin + currentUrl.pathname;
var currentParams = currentUrl.searchParams;
var meiUrl;
var meiFile = new MEIdoc();
var basicAnalysisDone = false;
var complexAnalysisDone = false;

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
            basicAnalysisDone = false;
            complexAnalysisDone = false;
        });
    }
}

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

function loadData() {
    vrvInterface.loadData(meiFile.text);
    $("#download").attr("href", URL.createObjectURL(meiFile.blob));
}

function makeXmlCode(htmlString) {
    let ltString = htmlString.replace(/</gm,"&lt;");
    let gtString = ltString.replace(/>/gm, "&gt;");

    return `<code>${gtString}</code>`
}

$(document).ready(function(){

    meiUrl = currentParams.get("url");
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
            $("#elementInfo").empty();
            loadData();
            basicAnalysisDone = false;
            complexAnalysisDone = false;
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
            complexBeats.addStartTimes(meiFile);
            meiFile.renewBlob();
            basicAnalysisDone = true;
            $("#beatIndependent").prop('disabled', true);
            loadData();
        }
    });

    $("#complexBeatAnalysis").click(function() {
        if(basicAnalysisDone===false)
        {
            basic.beatIndependentDurations(meiFile);
            complexBeats.addStartTimes(meiFile);
            basicAnalysisDone = true;
            $("#beatIndependent").prop('disabled', true);
        }

        if(basicAnalysisDone===true && complexAnalysisDone===false)
        {
            complexBeats.complexAnalysis(meiFile);
            post.run(meiFile);
            meiFile.renewBlob();
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

    $(window).resize(function(){
        vrvInterface.applyZoom();
    });

});