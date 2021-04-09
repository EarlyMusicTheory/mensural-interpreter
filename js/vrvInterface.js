"use strict";

var vrvInterface = (function () {
    /** private */
    const vrv = new verovio.toolkit();

    var zoom = 50;
    var pageHeight = 2970;
    var pageWidth = 2100;
    var page = 1;
    var svg;

    const elsToSelect = ".note,.rest";
    const blue = "#007bff";
    const red = "#dc3545";

    var keyUpInProgress = false;
    var eventsBinded = false;
    var shownEvent = null;
    var prevEvent = null;
    var nextEvent = null;
    

    function setOptions() {
        pageHeight = $(document).height() * 100 / zoom ;
        pageWidth = ($(window).width() - ($("#side").width() * 1.2) ) * 100 / zoom ;
        var options = {
                    pageHeight: pageHeight,
                    pageWidth: pageWidth,
                    scale: zoom,
                    adjustPageHeight: true
                };
        vrv.setOptions(options);
    }

    function loadPage() {
        $("#vrvPageN").html(page + "/" + vrv.getPageCount());
    
        svg = vrv.renderToSVG(page, {});
        $("#vrvOutput").html(svg);
        bindInteractionEvents();
        
    }

    function bindInteractionEvents() {
        /* Super fancy music interaction */
        // Undbind all events just for safety
        $(elsToSelect).off();
        // Highlight notes on mouseover
        $(elsToSelect).mouseover(function() {
            selectEvent(this);
        });
    
        // Click shows element information in sidebar
        $(elsToSelect).click(function() {
            showDetails(this);
        });
    
        // Remove highlighting on mouseout
        $(elsToSelect).mouseout(function() {
            deselectEvent(this);
        });

        // Add arrow left and right bindings to switch events
        // but first, unbind key events to avoid double jumps
        $(window).off("keyup");
        $(window).keyup(function(event) {
            if (keyUpInProgress===false && shownEvent) {
                keyUpInProgress = true;
                // right arrow
                if(event.keyCode===39) {
                    showDetails(nextEvent);
                }
                // left arrow
                if(event.keyCode===37) {
                    showDetails(prevEvent);
                }
                keyUpInProgress = false;
            }
        });
        eventsBinded = true;
    }

    /**
     * Select element for showing details
     * @param {DOMObject} eventEl 
     */
    function selectEvent(eventEl) {
        $(eventEl).attr("fill", blue);
    }

    /**
     * Deselect element
     * @param {DOMObject} eventEl 
     */
    function deselectEvent(eventEl) {
        if($(eventEl).attr("fill")!==red)
        {
            $(eventEl).removeAttr("fill");
        }
    }

    /**
     * Shows event details of chosen element
     * @param {DOMObject} eventEl 
     */
    function showDetails(eventEl) {
        hideDetails();
        $(eventEl).attr("fill", red);

        let thisID = $(eventEl).attr("id");
        let currentElement = meiFile.eventDict[thisID];
        let attributes = {};
        for (let attr of currentElement.attributes)
        {
            attributes[attr.nodeName] = attr.value;
        }


        let elementInfo = $("<dl id='attList' class='row'></dl>");
        for (let attr in attributes)
        {
            let dt = $("<dt class='col-4 text-truncate'></dt>").text(attr);
            let dd = $("<dd class='col-8'></dd>").text(attributes[attr]);
            $(elementInfo).append(dt);
            $(elementInfo).append(dd);
        }
        
        let elCode = makeXmlCode(currentElement.outerHTML);
        //$(elementInfo).after($(elCode).html());

        $("#elementInfo").html(elementInfo);
        $("#attList").after(elCode);
        shownEvent = eventEl;
        nextEvent = $(eventEl).next();
        prevEvent = $(eventEl).prev();
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
        $("#elementInfo").empty();
    }

    /* public */
    return {
        loadData : function (data) {
            eventsBinded = false;
            setOptions();
            vrv.loadData(data);
            loadPage();
        },

        nextPage : function () {
            if (page >= vrv.getPageCount()) {
                return;
            }
            page = page + 1;
            loadPage();
        },
        
        prevPage : function () {
            if (page <= 1) {
                return;
            }
            page = page - 1;
            loadPage();
        },
        
        applyZoom : function () {
            setOptions();
            vrv.redoLayout();
            page = 1;
            loadPage();
        },
        
        zoomOut : function () {
            if (zoom < 20) {
                return;
            }
            zoom = zoom / 2;
            applyZoom();
        },   
        
        zoomIn : function () {
            if (zoom > 80) {
                return;
            }
            zoom = zoom * 2;
            applyZoom();
        }
        
    }
})();
