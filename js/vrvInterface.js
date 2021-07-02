/** @fileoverview Contains interaction with Verovio toolkit and rendered music */
"use strict";

/**
 * @namespace vrvInterface
 * @desc Contains interaction with Verovio toolkit and rendered music
 */

var vrvInterface = (function () {
    /** private */
    const vrv = new verovio.toolkit();

    /** current zoom rate */
    var zoom = 50;
    /** current page height */
    var pageHeight = 2970;
    /** current page width */
    var pageWidth = 2100;
    /** current page numbrt */
    var page = 1;
    /** current svg to display */
    var svg;

    /** is a keyup event in progress? */
    var keyUpInProgress = false;
    /** are events currently bound? */
    var eventsBinded = false;
    /** elements for interaction */
    const elsToSelect = ".note,.rest,.dot,.mensur";
    

    /**
     * Sets Verovio options
     * @memberof vrvInterface
     * @inner
     */
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

    /**
     * Renders the current page of the loaded MEI file
     * Outputs current page number into page control
     * Binds interaction events
     * @memberof vrvInterface
     * @inner
     */
    function loadPage() {
        $("#vrvPageN").html(page + "/" + vrv.getPageCount());
    
        svg = vrv.renderToSVG(page, {});
        $("#vrvOutput").html(svg);
        bindInteractionEvents();
        
    }

    /**
     * Binds events to interact with rendered MEI
     * @memberof vrvInterface
     * @inner
     */
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
     * @memberof vrvInterface
     * @inner
     */
    function selectEvent(eventEl) {
        $(eventEl).attr("fill", blue);
    }

    /**
     * Deselect element
     * @param {DOMObject} eventEl 
     * @memberof vrvInterface
     * @inner
     */
    function deselectEvent(eventEl) {
        if($(eventEl).attr("fill")!==red)
        {
            $(eventEl).removeAttr("fill");
        }
    }

    /* public */
    return {
        /**
         * Loads Verovio rendering and bind events to interact with rendered MEI
         * @param {String} data 
         * @memberof vrvInterface
         */
        loadData : function (data) {
            eventsBinded = false;
            setOptions();
            vrv.loadData(data);
            loadPage();
        },

        /**
         * Go to next page if possible
         * @memberof vrvInterface
         */
        nextPage : function () {
            if (page >= vrv.getPageCount()) {
                return;
            }
            page = page + 1;
            loadPage();
        },
        
        /**
         * Go to previous page if possible
         * @memberof vrvInterface
         */
        prevPage : function () {
            if (page <= 1) {
                return;
            }
            page = page - 1;
            loadPage();
        },
        
        /**
         * Applies zoom after zoom has been set
         * @memberof vrvInterface
         */
        applyZoom : function () {
            setOptions();
            vrv.redoLayout();
            page = 1;
            loadPage();
        },
        
        /**
         * Half zoom and apply zoom
         * @memberof vrvInterface
         */
        zoomOut : function () {
            if (zoom < 20) {
                return;
            }
            zoom = zoom / 2;
            this.applyZoom();
        },   
        
        /**
         * Double zoom and apply zoom
         * @memberof vrvInterface
         */
        zoomIn : function () {
            if (zoom > 80) {
                return;
            }
            zoom = zoom * 2;
            this.applyZoom();
        }
        
    }
})();
