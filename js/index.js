/**
 * Application logic.
 *
 * @package themakermap
 */

(function($){
    /**
     * Parse Application ID
     */
    var PARSE_APP_ID = 'DFJN70XjqGwL5mgV9LfSUUEO8CeLh4V6iRR7zxKQ';
    /**
     * Parse ID for JavaScript API
     */
    var PARSE_JS_ID = 'EGGGNqXQ3kiYvEzLGQcDP1YfYGTnOqsR7FzvXu3J';

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
    function updateAnyCheckbox (e, parentNode) {
        var $target = $(e.target);
        var $boxen  = $(parentNode).find('input.classification-filter[type="checkbox"]').not('[value="any"]');
        var $any    = $(parentNode).find('input.classification-filter[value="any"]');

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
            content: "",
            maxWidth: 400
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
    
    function resetForm($form) {
        //TODO: Clear form fields
        $form.find("input").val("");
        $form.find("textarea").val("");
    }
    
    /**
     * 
     */
    function submitNewAsset() {
        showBusyIndicator();
        var asset = new MakerMap.Model.Asset();
        asset.set("title", $("#asset_title").val());
        asset.set("description", $("#asset_description").val());
        asset.set("address", $("#asset_address").val());
        asset.set("business_hours", $("#asset_businessHours").val());
        asset.set("quantity", parseInt($("#asset_quantity").val(), 10));
        asset.set("website", $("#asset_website").val());
        //asset.set("contact", $("#asset_contact").val());
        asset.set("owner_name", $("#asset_contributor").val());
        asset.set("is_supplier", $("#asset_supplier").is(":checked"));
        
        var mt = new MakerMap.Model.MaterialType();
        mt.id = $("#asset_material_type").val();
        
        asset.set("material_type", mt);
        
        asset.set("coordinates", new Parse.GeoPoint({ longitude: parseFloat($("#asset_longitude").val()), latitude: parseFloat($("#asset_latitude").val()) }));
        asset.save(null, {
            success: function(resp) {
                alert("New resource saved");
                resetForm($("#newAsset"));
                hideBusyIndicator();
                loadData();
            },
            error: function(resp, error) {
                alert("Error saving new resource: " + error);
                hideBusyIndicator();
            }
        });
    }
    
    /**
     * 
     */
    function submitNewMaker() {
        showBusyIndicator();
        var maker = new MakerMap.Model.Maker();
        maker.set("title", $("#maker_title").val());
        maker.set("description", $("#maker_description").val());
        
        var cls = new MakerMap.Model.PrimaryClassification();
        cls.id = $("#maker_classification").val();
        
        var bt = new MakerMap.Model.BusinessType();
        bt.id = $("#maker_business_type").val();
        
        maker.set("classification", cls);
        
        maker.set("business_type", bt);
        maker.set("business_hours", $("#maker_businessHours").val());
        maker.set("phone", $("#maker_phone").val());
        maker.set("email", $("#maker_email").val());
        maker.set("website", $("#maker_website").val());
        maker.set("owner_name", $("#maker_contributor").val());
        maker.set("is_supplier", $("#maker_supplier").is(":checked"));
        
        maker.set("coordinates", new Parse.GeoPoint({ longitude: parseFloat($("#maker_longitude").val()), latitude: parseFloat($("#maker_latitude").val()) }));
        maker.save(null, {
            success: function(resp) {
                alert("New maker saved");
                resetForm($("#newMaker"));
                hideBusyIndicator();
                loadData();
            },
            error: function(resp, error) {
                alert("Error saving new maker: " + error);
                hideBusyIndicator();
            }
        });
    }

    function initLookups() {
        var bTypes = $("#maker_business_type");
        var mtTypes = $("#asset_material_type");
        var clsList = $("#maker_classification");
        var filterList = $("#filter ul.filters");
        var filterMaterialsList = $("#filterMaterials ul.filters");
        var filterType = $("#filterType input[type=radio]");

        filterType.change(function(e){
          var searchType = jQuery(this).val();
          var searchSpace = (searchType === "space" || searchType === "all");
          var searchResource = (searchType === "resource" || searchType === "all");

          jQuery("#filter").closest(".filterWrap").toggle(searchSpace);
          jQuery("#filterMaterials").closest(".filterWrap").toggle(searchResource);
          loadData();
        });
        $("#filterType input[type=radio]:checked").trigger('change');
        // Load classifications
        var listBusy = $("<li><label><i class='fa fa-refresh fa-spin'></i> Loading Classifications ...</label></li>");
        listBusy.appendTo(filterList);
        
        var btBusy = $("<li><label><i class='fa fa-refresh fa-spin'></i> Loading Business Types ...</label></li>");
        btBusy.appendTo(filterList);
        var classQry = new Parse.Query(MakerMap.Model.PrimaryClassification);
        classQry.find({
            success: function(resp) {
                for (var i = 0; i < resp.length; i++) {
                    var cls = resp[i];
                    filterList.append("<li><label><img width='16' height='16' src='" + getIcon(cls.get("name")) + "' /> " + cls.get("friendlyName") + " <input type='checkbox' class='classification-filter' value='" + cls.id + "' /></label></li>");
                    clsList.append("<option value='" + cls.id + "'>" + cls.get("friendlyName") + "</option>");
                }
                
                // Filter
                filterList.find('input.classification-filter').click(function (e) {
                    updateAnyCheckbox(e, filterList);
                    loadData();
                });
                
                listBusy.remove();
            },
            failure: function(err) {
                alert("An error occurred loading primary classifications: " + err);
                listBusy.remove();
            }
        });
        
        var mtQuery = new Parse.Query(MakerMap.Model.MaterialType);
        mtQuery.find({
            success: function(resp) {
                for (var i = 0; i < resp.length; i++) {
                    var mt = resp[i];
                    filterMaterialsList.append("<li><label><img width='16' height='16' src='" + getIconMaterials(mt.get("name")) + "' /> " + mt.get("name") + " <input type='checkbox' class='classification-filter' value='" + mt.id + "' /></label></li>");
                    mtTypes.append("<option value='" + mt.id + "'>" + mt.get("name") + "</option>");
                }
                filterMaterialsList.find('input.classification-filter').click(function (e) {
                    updateAnyCheckbox(e, filterMaterialsList);
                    loadData();
                });
            },
            failure: function(err) {
                alert("An error occurred loading material types: " + error);
            }
        });
        
        var btQuery = new Parse.Query(MakerMap.Model.BusinessType);
        btQuery.find({
            success: function(resp) {
                for (var i = 0; i < resp.length; i++) {
                    var bt = resp[i];
                    bTypes.append("<option value='" + bt.id + "'>" + bt.get("name") + "</option>");
                    btBusy.remove();
                }
            },
            failure: function(err) {
                alert("An error occurred loading business types: " + error);
                btBusy.remove();
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
        var $nav    = $('#topn  v a');
        var $search = $('#search');
        var $filter = $('#filter');
        var $newMakerForm = $('#newMaker');
        var $newAssetForm = $('#newAsset');

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

        // Default render page to have search active
        $searchNav.addClass("active");

        $addContentNav.click(function () {
            $('.menu a.menu-btn').removeClass('active');
            $addContentNav.addClass("active");
            $('.searchMenu').hide();
            $('.aboutMenu').hide();
            $('.addResourceMenu').hide();
            $('.addContentMenu').show();
            makersLayer.setMap(null);
        });
        $addResourceNav.click(function () {
            $('.menu a.menu-btn').removeClass('active');
            $addResourceNav.addClass("active");
            $('.searchMenu').hide();
            $('.aboutMenu').hide();
            $('.addResourceMenu').show();
            $('.addContentMenu').hide();
            makersLayer.setMap(null);
        });

        $aboutNav.click(function () {
            $('.menu a.menu-btn').removeClass('active');
            $aboutNav.addClass("active");
            $('.searchMenu').hide();
            $('.addContentMenu').hide();
            $('.addResourceMenu').hide();
            $('.aboutMenu').show();
            console.log('content');
        });

        $searchNav.click(function () {
            $('.menu a.menu-btn').removeClass('active');
            $searchNav.addClass("active");
            $('.searchMenu').show();
            $('.aboutMenu').hide();
            $('.addResourceMenu').hide();
            $('.addContentMenu').hide();
            makersLayer.setMap(map);
        });
        
        $newMakerForm.submit(function() {
            submitNewMaker();
            return false;
        });
        
        $newAssetForm.submit(function() {
            submitNewAsset();
            return false;
        })
        
        initLookups();

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
            $('.filtersWrap').slideToggle();
        });
    }
    
    function mobileMenu() {
        $('.menuToggle').click(function(){
            $('#mobileWrap').slideToggle();
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
        if(mkr.get("classification")) {
            var marker_classification_symbol = mkr.get("classification").get("name")            
        }
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
                website: mkr.get("website"),
                marker_symbol: marker_classification_symbol
            }
        };
        return new google.maps.Data.Feature(obj);
    }
    function getIconMaterials(symbolName){
      return getIcon(symbolName, "materials");
    }
    function getIcon(symbolName, folderName) {
      if (!symbolName || symbolName === "") {
          return null;
      }
      if (!folderName || folderName === "") {
          folderName = "markers";
      }
        var relPart = "img/" + folderName + "/" + symbolName + ".png";
        //HACK: Should be a better way to get the URL base of index.html
        if (window.location.pathname.indexOf("index.html") >= 0)
            return window.location.pathname.replace("index.html", relPart);
        else
            return relPart;
    }
    
    function showBusyIndicator() {
        $("#mainBusy").show();
        $(".header-img").hide();
    }
    
    function hideBusyIndicator() {
        $("#mainBusy").hide();
        $(".header-img").show();
    }

    /**
     * Reload the markers on the map based on the current search and filtering criteria
     */
    function loadData() {
        showBusyIndicator();
        
        var query_array = [];
        var maker_query = new Parse.Query(MakerMap.Model.Maker);
        var asset_query = new Parse.Query(MakerMap.Model.Asset);

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
            var maker_title_query = new Parse.Query(MakerMap.Model.Maker);
            var maker_description_query = new Parse.Query(MakerMap.Model.Maker);

            var asset_title_query = new Parse.Query(MakerMap.Model.Asset);
            var asset_description_query = new Parse.Query(MakerMap.Model.Asset);
            maker_title_query.contains("title", search_string);
            maker_description_query.contains("description", search_string);
            asset_title_query.contains("title", search_string);
            asset_description_query.contains("description", search_string);
            
            maker_query = Parse.Query.or(maker_title_query, maker_description_query);
            asset_query = Parse.Query.or(asset_title_query, asset_description_query);
        }
        
        if($('#filter').find('input.classification-filter[value="any"]:checked').length == 0) {
            $('#filter').find('input.classification-filter[type="checkbox"]:checked').each(function () {
                query_array.push($(this).attr('value'));
            });
            //This is basically: Maker.classification in [selected object ids from PrimaryClassification]
            var lookupQuery = new Parse.Query(MakerMap.Model.PrimaryClassification);
            lookupQuery.containedIn("objectId", query_array);
            maker_query.matchesKeyInQuery("classification", "objectId", lookupQuery);
        }
        if($('#filterMaterials').find('input.classification-filter[value="any"]:checked').length == 0) {
            $('#filterMaterials').find('input.classification-filter[type="checkbox"]:checked').each(function () {
                query_array.push($(this).attr('value'));
            });
            //This is basically: Maker.classification in [selected object ids from PrimaryClassification]
            var lookupQuery = new Parse.Query(MakerMap.Model.MaterialType);
            lookupQuery.containedIn("objectId", query_array);
            asset_query.matchesKeyInQuery("material_type", "objectId", lookupQuery);
        }
        
        var searchType = $("#filterType input[type=radio]:checked").val();
        var searchSpace = (searchType === "space" || searchType === "all");
        var searchResource = (searchType === "resource" || searchType === "all");
        if(searchSpace)
        {
          maker_query.include("classification");
          maker_query.find({
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
        if(searchResource)
        {
          asset_query.find({
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
    }

    function setupEventListeners() {
        makersLayer.addListener('click', function(event) {
            var website_description = "";
            if(event.feature.getProperty('website')) {
                website_description = '<div class="map-website"><p>Website: <a href="'+event.feature.getProperty('website')+'">'+event.feature.getProperty('website')+'</a></p></div>';
            }
            infoWindow.setContent(
                '<div class="mapDescription"><h3>'+event.feature.getProperty('title')+'</h3>'+
                '<p>'+event.feature.getProperty('description')+'</p>'+
                '<p>' + website_description + '</p>' + 
                '</div>'
            );
            var anchor = new google.maps.MVCObject();
            anchor.set("position",event.latLng);
            infoWindow.open(map,anchor);
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
        $('#maker_address').geocomplete({
            map: map,
            details: ".maker-coordinates",
            detailsAttribute: "data-geo"
        });
        $('#asset_address').geocomplete({
            map: map,
            details: ".asset-coordinates",
            detailsAttribute: "data-geo"
        });
    });
})(jQuery);
