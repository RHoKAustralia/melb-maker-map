/**
 * Application logic.
 *
 * @package themakermap
 */

(function($){
    /**
     * Parse Application ID
     */
    var PARSE_APP_ID = 'wj2jWY2HA6L4C1qpWuZzsruUHkO8BZjIbtUI0hmr';
    /**
     * Parse ID for JavaScript API
     */
    var PARSE_JS_ID = '3GNfJdTZKsLlRrqsH1n8vJtrgFCRwuCmfb33Y2JG';

    /**
     * Storage objects
     */
    var makersLayer;
    var map, layer, infoWindow;

    /**
     * Window rendering handler.
     */
    function render () {
        var $map    = $('#map-wrapper');
        var calc    = $(window).height() - $map.position().top;

        $map.css('height', calc + 'px');
    }
    
    /**
     * Strips all HTML tags from the given string
     * 
     * @param {String} dirtyString
     * 
     * @return {String}
     */
    function stripHTML(dirtyString) {
        var container = document.createElement('div');
        container.innerHTML = dirtyString;
        return container.textContent || container.innerText;
    }

    /**
     * Event handler for checkbox controls.
     *
     * @param {Object} Event
     *
     * @return {void}
     */
    function updateAnyCheckbox (e) {
        var $target = $(e.target);
        var $boxen  = $('#filter').find('input.classification-filter[type="checkbox"]').not('[value="any"]');
        var $any    = $('#filter').find('input.classification-filter[value="any"]');

        if ($target.val() == 'any') {
            // Update other checkboxes based on "any" state
            if ($any.is(':checked')) {
                $boxen.prop('checked', 'checked');
            } else {
                $boxen.removeAttr('checked');
            }
        } else {
            // Update "any" checkbox based on others' state
            if ($boxen.not(':checked').length) {
                $any.removeAttr('checked');
            } else {
                $any.prop('checked', 'checked');
            }
        }
    }

    /**
     * Google Maps
     */
    function initMaps () {
        map = new google.maps.Map(document.getElementById('map-canvas'), {
            center: new google.maps.LatLng(-37.8136, 144.9631),
            zoom: 9,
            disableDefaultUI: true,
            zoomControl: true,
            zoomControlOptions: {
                style: google.maps.ZoomControlStyle.LARGE,
                position: google.maps.ControlPosition.TOP_RIGHT
            },
            streetViewControl: true
        });

        var style = [
            {
                elementType: 'geometry',
                stylers: [
                    { saturation: -100 },
                    { weight: 0.4 }
                ]
            },
            {
                featureType: 'poi',
                stylers: [
                    { visibility: "off" }
                ]
            },
            {
                featureType: 'administrative.land_parcel',
                elementType: 'all',
                stylers: [
                    { visibility: 'off' }
                ]
            }
        ];

        var styledMapType = new google.maps.StyledMapType(style, {
            map: map,
            name: 'Styled Map'
        });

        map.mapTypes.set('map-style', styledMapType);
        map.setMapTypeId('map-style');

        infoWindow = new google.maps.InfoWindow({
            content: ""
        });
        loadData();

        if (navigator && navigator.geolocation) {
           locateMe();
        }
    }

    /**
     * Centers the map to the user's geolocated position
     */
    function locateMe () {
        navigator.geolocation.getCurrentPosition(function(position) {
            var latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            map.setCenter(latlng);
            map.setZoom(12);
    
            $('.locateMe').fadeIn(1000,function(){
                $(this).tooltip('show');
            }).css("display",'table');
        });
        $('.locateMe').click(function(){
            locateMe();
        });
    }
    
    function resetForm() {
        //TODO: Clear form fields
    }
    
    /**
     * 
     */
    function submitNewMaker() {
        showBusyIndicator();
        var maker = new MakerMap.Model.Maker();
        maker.set("title", $("#title").val());
        maker.set("description", $("#description").val());
        
        var cls = new MakerMap.Model.PrimaryClassification();
        cls.id = $("#classification").val();
        
        maker.set("classification", cls);
        
        maker.set("coordinates", new Parse.GeoPoint({ longitude: parseFloat($("#new_maker_longitude").val()), latitude: parseFloat($("#new_maker_latitude").val()) }));
        maker.save(null, {
            success: function(resp) {
                alert("New maker saved");
                resetForm();
                hideBusyIndicator();
                loadData();
            },
            error: function(resp, error) {
                alert("Error saving new maker: " + error);
                hideBusyIndicator();
            }
        });
    }

    /**
     * UI events
     */
    function initEventListeners () {
        // Selectors
        var $searchNav  = $('#search-nav');
        var $addContentNav = $('.addContent');
        var $addResourceNav = $('.addResource');
        var $aboutNav = $('#about-nav');
        var $window = $(window);
        var $nav    = $('#topnav a');
        var $search = $('#search');
        var $filter = $('#filter');
        var $submit = $('#newMaker');

        // Resize handler
        $window.resize(render);

        // Top nav
        $.hovertips($nav, {
            delay_hide:     0,
            delay_hover:    0,
            delay_leave:    0,
            render: function($el, data, loading) {
                var $tooltip;
                var self = this;
                $tooltip = $('<div>');
                $tooltip.addClass('nav-tooltip')
                $tooltip.html($el.find('img').attr('alt'));
                $el.on('click', function() {
                    self.hide(0);
                });
                return $tooltip;
            }
        });

        $addContentNav.click(function () {
            $('.searchMenu').hide();
            $('.aboutMenu').hide();
            $('.addResourceMenu').hide();
            $('.addContentMenu').show();
            makersLayer.setMap(null);
        });
        $addResourceNav.click(function () {
            $('.searchMenu').hide();
            $('.aboutMenu').hide();
            $('.addResourceMenu').show();
            $('.addContentMenu').hide();
            makersLayer.setMap(null);
        });

        $aboutNav.click(function () {
            $('.searchMenu').hide();
            $('.addContentMenu').hide();
            $('.addResourceMenu').hide();
            $('.aboutMenu').show();
            console.log('content');
        });

        $searchNav.click(function () {
            $('.searchMenu').show();
            $('.aboutMenu').hide();
            $('.addResourceMenu').hide();
            $('.addContentMenu').hide();
            makersLayer.setMap(map);
        });
        
        $submit.submit(function() {
            submitNewMaker();
            return false;
        });
        
        var clsList = $("#classification");
        var filterList = $("ul.filters");
        // Load classifications
        var listBusy = $("<li><label>Loading Classifications ...</label></li>");
        listBusy.appendTo(filterList);
        var classQry = new Parse.Query(MakerMap.Model.PrimaryClassification);
        classQry.find({
            success: function(resp) {
                for (var i = 0; i < resp.length; i++) {
                    var cls = resp[i];
                    filterList.append("<li><label><img width='16' height='16' src='" + getIcon(cls.get("name")) + "' /> " + cls.get("friendlyName") + " <input type='checkbox' class='classification-filter' value='" + cls.id + "' /></label></li>");
                    clsList.append("<option value='" + cls.id + "'>" + cls.get("friendlyName") + "</option>")
                }
                
                // Filter
                $filter.find('input.classification-filter').click(function (e) {
                    updateAnyCheckbox(e);
                    loadData();
                });
                
                listBusy.remove();
            },
            failure: function(err) {
                alert("An error occurred loading primary classifications: " + err);
                listBusy.remove();
            }
        });

        // Search
        $search.submit(function () {
            return false;
        });

        $search.find('input').keyup(function () {
            loadData();
        });
    }

    function filterMenu() {
        $('.filterIcon').click(function(){
            $('.filterWrap').slideToggle();
        });
    }
    
    function mobileMenu() {
        $('.menuToggle').click(function(){
            $('.aboutWrap').slideToggle();
        });
    }

    function initSocialite() {
        Socialite.load($('div.footer'));
    }

    /**
     * Converts a Maker Parse instance to a google.maps.Data.Feature instance
     * for placement on a map
     */
    function makerToFeature(mkr) {
        var coords = mkr.get("coordinates").toJSON();
        var obj = {
            id: mkr.id,
            geometry: {
                lng: coords.longitude,
                lat: coords.latitude
            },
            properties: {
                title: mkr.get("title"),
                description: mkr.get("description"),
                marker_color: mkr.get("marker_color"),
                marker_size: mkr.get("marker_size"),
                marker_symbol: mkr.get("classification").get("name")
            }
        };
        return new google.maps.Data.Feature(obj);
    }
    
    function getIcon(symbolName) {
        if (!symbolName || symbolName == "") {
            return null;
        }
        var relPart = "img/markers/" + symbolName + ".png";
        //HACK: Should be a better way to get the URL base of index.html
        if (window.location.pathname.indexOf("index.html") >= 0)
            return window.location.pathname.replace("index.html", relPart);
        else
            return relPart;
    }
    
    function showBusyIndicator() {
        $("#mainBusy").show();
    }
    
    function hideBusyIndicator() {
        $("#mainBusy").hide();
    }

    /**
     * Reload the markers on the map based on the current search and filtering criteria
     */
    function loadData() {
        showBusyIndicator();
        
        var query_array = [];
        var query = new Parse.Query(MakerMap.Model.Maker);
        
        // Detach the layer before replacing
        if (makersLayer) {
            makersLayer.setMap(null);
        }
        makersLayer = new google.maps.Data();
        makersLayer.setStyle(function(feature) {
            return {
                fillColor: feature.getProperty("marker_color"),
                clickable: true,
                title: stripHTML(feature.getProperty("title")),
                icon: getIcon(feature.getProperty("marker_symbol"))
            };
        });

        var search_string = $('#search').find('input').val();
        if(search_string != "") {
            var title_query = new Parse.Query(MakerMap.Model.Maker);
            var description_query = new Parse.Query(MakerMap.Model.Maker);
            title_query.contains("title", search_string);
            description_query.contains("description", search_string);
            query = Parse.Query.or(title_query, description_query);
        }
        
        if($('#filter').find('input.classification-filter[value="any"]:checked').length == 0) {
            $('#filter').find('input.classification-filter[type="checkbox"]:checked').each(function () {
                query_array.push($(this).attr('value'));
            });
            //This is basically: Maker.classification in [selected object ids from PrimaryClassification]
            var lookupQuery = new Parse.Query(MakerMap.Model.PrimaryClassification);
            lookupQuery.containedIn("objectId", query_array);
            query.matchesKeyInQuery("classification", "objectId", lookupQuery);
        }

        query.include("classification");
        query.find({
            success: function(resp) {
                for (var i = 0; i < resp.length; i++) {
                    makersLayer.add(makerToFeature(resp[i]));
                }
                makersLayer.setMap(map);
                setupEventListeners();
                hideBusyIndicator();
            },
            failure: function(err) {
                alert("Error loading markers: " + err);
                hideBusyIndicator();
            }
        });
    }

    function setupEventListeners() {
        makersLayer.addListener('click', function(event) {
            infoWindow.setContent(
                '<h2>'+event.feature.getProperty('title')+'</h2>'+
                '<p>'+event.feature.getProperty('description')+'</p>'
            );
            var anchor = new google.maps.MVCObject();
            anchor.set("position",event.latLng);
            infoWindow.open(map,anchor);
            // var latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            map.setCenter(event.latLng);
            map.setZoom(12);
        });
    };

    //Init the parse API
    Parse.initialize(PARSE_APP_ID, PARSE_JS_ID);
    /**
     * On load, init maps & start listening for UI events
     */
    render();
    initMaps();
    initEventListeners();
    filterMenu();
    mobileMenu();
    $('.aboutMenu').hide();
    $('.addResourceMenu').hide();
    initSocialite();
    
    $(document).ready(function(){
        $('#address').geocomplete({
            map: map,
            details: ".maker-coordinates",
            detailsAttribute: "data-geo"
        });
    });
})(jQuery);
