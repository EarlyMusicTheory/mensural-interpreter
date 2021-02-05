var vrv = new verovio.toolkit();
    var currentUrl = new URL(window.location.href);
    var baseUrl = currentUrl.origin + currentUrl.pathname;
    var currentParams = currentUrl.searchParams;
    var meiUrl;
    var meiFile;
    var zoom = 50;
    var pageHeight = 2970;
    var pageWidth = 2100;
    var page = 1;
    var svg;
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
                loadData(text);
            });
        }
    }

    function setOptions() {
        pageHeight = $(document).height() * 100 / zoom ;
        pageWidth = ($(window).width() - ($("#side").width() * 1.2) ) * 100 / zoom ;
        options = {
                    pageHeight: pageHeight,
                    pageWidth: pageWidth,
                    scale: zoom,
                    adjustPageHeight: true
                };
        vrv.setOptions(options);
    }

    function loadData (data) {
        setOptions();
        vrv.loadData(data);
        loadPage();
        bindInteractionEvents();
    }
    
    function loadPage() {
        $("#vrvPageN").html(page + "/" + vrv.getPageCount());

        svg = vrv.renderToSVG(page, {});
        $("#vrvOutput").html(svg);
        bindInteractionEvents();
        //adjust_page_height();
        
    };

    function nextPage() {
        if (page >= vrv.getPageCount()) {
            return;
        }

        page = page + 1;
        loadPage();
    };

    function prevPage() {
        if (page <= 1) {
            return;
        }

        page = page - 1;
        loadPage();
    };

    function applyZoom() {
        setOptions();
        vrv.redoLayout();

        page = 1;
        loadPage();
    }

    function zoomOut() {
        if (zoom < 20) {
            return;
        }
        zoom = zoom / 2;
        applyZoom();
    };   

    function zoomIn() {
        if (zoom > 80) {
            return;
        }
        zoom = zoom * 2;
        applyZoom();
    };


    function bindInteractionEvents() {
        /* Super fancy music interaction */
        // Highlight notes on mouseover
        $(".note").mouseover(function() {
            $(this).attr("fill", "#007bff");
        });

        // Click shows element information in sidebar
        $(".note").click(function() {
            let thisID = $(this).attr("id");
            let thisElementAttrs = vrv.getElementAttr(thisID);

            let elementInfo = $("<ul></ul>");

            for (const [key, value] of Object.entries(thisElementAttrs)) {
                let attr = $("<li></li>").text(`${key}: ${value}`);
                $(elementInfo).append(attr);
            }

            $("#elementInfo").html(elementInfo);
        });

        // Remove highlighting on mouseout
        $(".note").mouseout(function() {
            $(this).attr("fill", "#000");
        });
    };
    
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
                loadData(event.target.result);
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
            nextPage();
        });
        $("#vrvBack").click(function() {
            prevPage();
        });

        $("#vrvZoomIn").click(function() {
            zoomIn();
        });

        $("#vrvZoomOut").click(function() {
            zoomOut();
        });

        $(window).resize(function(){
            applyZoom();
        });

        $("#elementInfo").click(function() {
            $(this).empty();
        });

    });