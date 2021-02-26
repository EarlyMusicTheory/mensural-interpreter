"use strict";

var currentUrl = new URL(window.location.href);
var baseUrl = currentUrl.origin + currentUrl.pathname;
var currentParams = currentUrl.searchParams;
var meiUrl;
var meiFile;


//var mei;


function fetchMEI(meiUrl) {
    if(meiUrl)
    {
        fetch(meiUrl)
        .then(function(response) {
            return response.text();
        })
        .then(function(text) {
            meiFile = text;
            vrvInterface.loadData(text);
        });
    }
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
            meiFile = event.target.result;
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