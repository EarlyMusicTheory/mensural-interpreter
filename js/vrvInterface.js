"use strict";

var vrvInterface = (function () {
    /** private */
    const vrv = new verovio.toolkit();

    var zoom = 50;
    var pageHeight = 2970;
    var pageWidth = 2100;
    var page = 1;
    var svg;

    var elsToSelect = ".note,.rest";

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
        //adjust_page_height();
        
    }

    function bindInteractionEvents() {
        /* Super fancy music interaction */
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
    }

    function selectEvent(eventEl) {
        $(eventEl).attr("fill", "#007bff");
    }

    function deselectEvent(eventEl) {
        if($(eventEl).attr("fill")!=="#dc3545")
        {
            $(eventEl).removeAttr("fill");
        }
    }

    function showDetails(eventEl) {
        hideDetails();
        $(eventEl).attr("fill", "#dc3545");
        
        let thisID = $(eventEl).attr("id");
        let thisElementAttrs = vrv.getElementAttr(thisID);

        let elementInfo = $("<ul></ul>");

        for (const [key, value] of Object.entries(thisElementAttrs)) {
            let attr = $("<li></li>").text(`${key}: ${value}`);
            $(elementInfo).append(attr);
        }

        $("#elementInfo").html(elementInfo);
    }

    function hideDetails() {
        $("[fill='#dc3545']").removeAttr("fill");
        $("#elementInfo").empty();
    }

    /* public */
    return {
        loadData : function (data) {
            setOptions();
            vrv.loadData(data);
            loadPage();
            bindInteractionEvents();
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
