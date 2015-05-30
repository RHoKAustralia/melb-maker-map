/**
 * Application logic.
 *
 * @package themakermap
 */

(function($){
    /**
     * Configuration
     */
    var dataProvider = '1tteiG-HYAlsmh3ef5U-XVDEWu5QXqDxqWwDx-pc';

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
		
		

    /**
     * UI events
     */
    function initEventListeners () {
        // Selectors
        var $searchNav  = $('#search-nav');
        var $addContentNav = $('#add-content-nav');
        var $aboutNav = $('#about-nav');
        var $window = $(window);
        var $nav    = $('#topnav a');
        var $search = $('#search');
        var $filter = $('#filter');

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
            $('.addContentMenu').show();
            makersLayer.setMap(null);
        });

        $aboutNav.click(function () {
            $('.searchMenu').hide();
            $('.addContentMenu').hide();
            $('.aboutMenu').show();
            console.log('content');
        });

        $searchNav.click(function () {
            $('.searchMenu').show();
            $('.aboutMenu').hide();
            $('.addContentMenu').hide();
            makersLayer.setMap(map);
        });
        
        // Load classifications
        var classQry = new Parse.Query(MakerMap.Model.PrimaryClassification);
        classQry.find({
            success: function(resp) {
                for (var i = 0; i < resp.length; i++) {
                    var cls = resp[i];
                    $("ul.filters").append("<li><label>" + cls.get("friendlyName") + " <input type='checkbox' class='classification-filter' value='" + cls.id + "' /></label></li>");
                }
                
                // Filter
                $filter.find('input.classification-filter').click(function (e) {
                    updateAnyCheckbox(e);
                    loadData();
                });
            },
            failure: function(err) {
                alert("An error occurred loading primary classifications: " + err);
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
		
		function aboutModal() {
			var aboutContent = $('.aboutWrap').html();
			$('#aboutModal .modal-body').html(aboutContent);
			
			$('.about .searchAction').click(function(){
				$('#aboutModal').modal('hide');
				$('#searchForm').focus();
			});
			
    		}

    function initSocialite() {
        Socialite.load($('div.footer'));
    }

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
                marker_symbol: mkr.get("marker_symbol")
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

    function loadData() {
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
                title: feature.getProperty("title"),
                icon: getIcon(feature.getProperty("marker_symbol"))
            };
        });

        search_string = $('#search').find('input').val();
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
            var lookupQuery = new Parse.Query(MakerMap.Model.PrimaryClassification);
            lookupQuery.containedIn("objectId", query_array);
            query.matchesKeyInQuery("classification", "objectId", lookupQuery);
        }

        query.find({
            success: function(resp) {
                for (var i = 0; i < resp.length; i++) {
                    makersLayer.add(makerToFeature(resp[i]));
                }
                makersLayer.setMap(map);
                setupEventListeners();
            },
            failure: function(err) {
                alert("Error loading markers: " + err);
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
        });
    };

    $(document).ready(function(){
        $('#location').geocomplete();
    });

    //Init the parse API
    Parse.initialize("wj2jWY2HA6L4C1qpWuZzsruUHkO8BZjIbtUI0hmr" /* App ID */, "3GNfJdTZKsLlRrqsH1n8vJtrgFCRwuCmfb33Y2JG" /* JS Key */);
    /**
     * On load, init maps & start listening for UI events
     */
    render();
    initMaps();
    initEventListeners();
		filterMenu();
		mobileMenu();
		aboutModal();
    initSocialite();

})(jQuery);
