"use strict";

var currentUrl = new URL(window.location.href);
var baseUrl = currentUrl.origin + currentUrl.pathname;
var currentParams = currentUrl.searchParams;
var meiUrl;
var meiFile = new MEIdoc();
var sections;

function fetchMEI(meiUrl) {
    if(meiUrl)
    {
        fetch(meiUrl)
        .then(function(response) {
            return response.text();
        })
        .then(function(text) {
            meiFile.text = text;
            vrvInterface.loadData(text);
        });
    }
}

function getSectionBlocks() {
    sections = blockifier.getBlocksFromSections(meiFile.doc);
    
    if (sections.length > 0) {
        $("#blockCount").text(sections.length);
        $("#blockTableBody").empty();
        for(let i = 0; i < sections.length; i++) {
            let blockRow = $("<tr></tr>");
            blockRow.append(`<td>${i}</td>`);
            blockRow.append(`<td>${sections[i].mens ? makeXmlCode(sections[i].mens.outerHTML) : ''}</td>`);
            blockRow.append(`<td>${sections[i].prop ? makeXmlCode(sections[i].prop.outerHTML) : ''}</td>`);
            blockRow.append(`<td>${sections[i].prevPropMultiplier ? sections[i].prevPropMultiplier : ''}</td>`);
            blockRow.append(`<td>${sections[i].events.length}</td>`);
            $("#blockTableBody").append(blockRow);
        }

        $("#blocksInfo").modal('show');
    }
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
            vrvInterface.loadData(event.target.result);
        };    
    });

    $("#btnResetFile").click(function() {
        $("#fileInput")[0].reset();
    });
    
    $("#load").click(function() {
        let input = $("#url").val();
        currentParams.set("url", input);
        location.replace(`${baseUrl}?${currentParams}`);
        return false;
    });

    $("#blockify").click(function() {
        getSectionBlocks();
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

    $("#elementInfo").click(function() {
        $(this).empty();
    });

});