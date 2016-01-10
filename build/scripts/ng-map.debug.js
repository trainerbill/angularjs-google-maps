angular.module('ngMap', ['ngLodash']);

(function() {
  'use strict';

  angular
    .module('ngMap')
    .controller('__InitializeNgMapController', __InitializeNgMapController);

  __InitializeNgMapController.$inject = [ '$element', '$attrs', 'MapPool', 'lodash', '$scope', '$compile', 'NgMap' ];
  function __InitializeNgMapController($element, $attrs, MapPool, lodash, $scope, $compile, NgMap) {
    var vm = this;

    MapPool
      .getMap($element)
      .then(function (map) {
        vm.map = map;
      })
      .catch(function (err) {
        console.log('Failed map load');
      });





  }
})();

/**
 * @ngdoc controller
 * @name MapController
 */
(function() {
  'use strict';
  var Attr2MapOptions;

  var __MapController = function(
      $scope, $element, $attrs, $parse, _Attr2MapOptions_, NgMap, NgMapPool
    ) {
    Attr2MapOptions = _Attr2MapOptions_;
    var vm = this;

    vm.mapOptions; /** @memberof __MapController */
    vm.mapEvents;  /** @memberof __MapController */

    /**
     * Add an object to the collection of group
     * @memberof __MapController
     * @function addObject
     * @param groupName the name of collection that object belongs to
     * @param obj  an object to add into a collection, i.e. marker, shape
     */
    vm.addObject = function(groupName, obj) {
      if (vm.map) {
        vm.map[groupName] = vm.map[groupName] || {};
        var len = Object.keys(vm.map[groupName]).length;
        vm.map[groupName][obj.id || len] = obj;

        if (vm.map instanceof google.maps.Map) {
          //infoWindow.setMap works like infoWindow.open
          if (groupName != "infoWindows" && obj.setMap) {
            obj.setMap && obj.setMap(vm.map);
          }
          if (obj.centered && obj.position) {
            vm.map.setCenter(obj.position);
          }
          (groupName == 'markers') && vm.objectChanged('markers');
          (groupName == 'customMarkers') && vm.objectChanged('customMarkers');
        }
      }
    };

    /**
     * Delete an object from the collection and remove from map
     * @memberof __MapController
     * @function deleteObject
     * @param {Array} objs the collection of objects. i.e., map.markers
     * @param {Object} obj the object to be removed. i.e., marker
     */
    vm.deleteObject = function(groupName, obj) {
      /* delete from group */
      if (obj.map) {
        var objs = obj.map[groupName];
        for (var name in objs) {
          if (objs[name] === obj) {
            console.log('Deleting', groupName, obj);
            google.maps.event.clearInstanceListeners(obj);
            delete objs[name];
          }
        }

        /* delete from map */
        obj.map && obj.setMap && obj.setMap(null);

        (groupName == 'markers') && vm.objectChanged('markers');
        (groupName == 'customMarkers') && vm.objectChanged('customMarkers');
      }
    };

    /**
     * @memberof __MapController
     * @function observeAttrSetObj
     * @param {Hash} orgAttrs attributes before its initialization
     * @param {Hash} attrs    attributes after its initialization
     * @param {Object} obj    map object that an action is to be done
     * @description watch changes of attribute values and
     * do appropriate action based on attribute name
     */
    vm.observeAttrSetObj = function(orgAttrs, attrs, obj) {
      if (attrs.noWatcher) {
        return false;
      }
      var attrsToObserve = Attr2MapOptions.getAttrsToObserve(orgAttrs);
      for (var i=0; i<attrsToObserve.length; i++) {
        var attrName = attrsToObserve[i];
        attrs.$observe(attrName, NgMap.observeAndSet(attrName, obj));
      }
    };

    /**
     * @memberof __MapController
     * @function zoomToIncludeMarkers
     */
    vm.zoomToIncludeMarkers = function() {
      var bounds = new google.maps.LatLngBounds();
      for (var k1 in vm.map.markers) {
        bounds.extend(vm.map.markers[k1].getPosition());
      }
      for (var k2 in vm.map.customMarkers) {
        bounds.extend(vm.map.customMarkers[k2].getPosition());
      }
      vm.map.fitBounds(bounds);
    };

    /**
     * @memberof __MapController
     * @function objectChanged
     * @param {String} group name of group e.g., markers
     */
    vm.objectChanged = function(group) {
      if ( vm.map &&
        (group == 'markers' || group == 'customMarkers') &&
        vm.map.zoomToIncludeMarkers == 'auto'
      ) {
        vm.zoomToIncludeMarkers();
      }
    };

    /**
     * @memberof __MapController
     * @function initializeMap
     * @description
     *  . initialize Google map on <div> tag
     *  . set map options, events, and observers
     *  . reset zoom to include all (custom)markers
     */
    vm.initializeMap = function() {
      var mapOptions = vm.mapOptions,
          mapEvents = vm.mapEvents;

      var lazyInitMap = vm.map; //prepared for lazy init
      vm.map = NgMapPool.getMapInstance($element[0]);
      NgMap.setStyle($element[0]);

      // set objects for lazyInit
      if (lazyInitMap) {

        /**
         * rebuild mapOptions for lazyInit
         * becasue attributes values might have been changed
         */
        var filtered = Attr2MapOptions.filter($attrs);
        var options = Attr2MapOptions.getOptions(filtered);
        var controlOptions = Attr2MapOptions.getControlOptions(filtered);
        mapOptions = angular.extend(options, controlOptions);
        console.log('map options', mapOptions);

        for (var group in lazyInitMap) {
          var groupMembers = lazyInitMap[group]; //e.g. markers
          if (typeof groupMembers == 'object') {
            for (var id in groupMembers) {
              vm.addObject(group, groupMembers[id]);
            }
          }
        }
        vm.map.showInfoWindow = vm.showInfoWindow;
        vm.map.hideInfoWindow = vm.hideInfoWindow;
      }

      // set options
      mapOptions.zoom = mapOptions.zoom || 15;
      var center = mapOptions.center;
      if (!mapOptions.center ||
        ((typeof center === 'string') && center.match(/\{\{.*\}\}/))
      ) {
        mapOptions.center = new google.maps.LatLng(0, 0);
      } else if (!(center instanceof google.maps.LatLng)) {
        var geoCenter = mapOptions.center;
        delete mapOptions.center;
        NgMap.getGeoLocation(geoCenter, mapOptions.geoLocationOptions).
          then(function (latlng) {
            vm.map.setCenter(latlng);
            var geoCallback = mapOptions.geoCallback;
            geoCallback && $parse(geoCallback)($scope);
          }, function () {
            if (mapOptions.geoFallbackCenter) {
              vm.map.setCenter(mapOptions.geoFallbackCenter);
            }
          });
      }
      vm.map.setOptions(mapOptions);

      // set events
      for (var eventName in mapEvents) {
        google.maps.event.addListener(vm.map, eventName, mapEvents[eventName]);
      }

      // set observers
      vm.observeAttrSetObj(orgAttrs, $attrs, vm.map);
      vm.singleInfoWindow = mapOptions.singleInfoWindow;

      google.maps.event.trigger(vm.map, 'resize');

      google.maps.event.addListenerOnce(vm.map, "idle", function () {
        NgMap.addMap(vm);
        if (mapOptions.zoomToIncludeMarkers) {
          vm.zoomToIncludeMarkers();
        }
        //TODO: it's for backward compatibiliy. will be removed
        $scope.map = vm.map;
        $scope.$emit('mapInitialized', vm.map);

        //callback
        if ($attrs.mapInitialized) {
          $parse($attrs.mapInitialized)($scope, {map: vm.map});
        }
      });
    };

    $scope.google = google; //used by $scope.eval to avoid eval()

    /**
     * get map options and events
     */
    var orgAttrs = Attr2MapOptions.orgAttributes($element);
    var filtered = Attr2MapOptions.filter($attrs);
    var options = Attr2MapOptions.getOptions(filtered, {scope: $scope});
    var controlOptions = Attr2MapOptions.getControlOptions(filtered);
    var mapOptions = angular.extend(options, controlOptions);
    var mapEvents = Attr2MapOptions.getEvents($scope, filtered);
    console.log('ng-map Options', mapOptions);
    Object.keys(mapEvents).length && console.log('ng-map Events', mapEvents);

    vm.mapOptions = mapOptions;
    vm.mapEvents = mapEvents;

    if (options.lazyInit) { // allows controlled initialization
      vm.map = {id: $attrs.id}; //set empty, not real, map
      NgMap.addMap(vm);
    } else {
      vm.initializeMap();
    }

    //Trigger Resize
    if(options.triggerResize) {
      google.maps.event.trigger(vm.map, 'resize');
    }
    /*

    $element.bind('$destroy', function() {
      NgMapPool.returnMapInstance(vm.map);
      NgMap.deleteMap(vm);
    });
    */
  }; // __MapController

  __MapController.$inject = [
    '$scope', '$element', '$attrs', '$parse', 'Attr2MapOptions', 'NgMap', 'NgMapPool'
  ];
  angular.module('ngMap').controller('__MapController', __MapController);
})();

/**
 * @ngdoc directive
 * @name bicycling-layer
 * @param Attr2Options {service}
 *   convert html attribute to Gogole map api options
 * @description
 *   Requires:  map directive
 *   Restrict To:  Element
 *
 * @example
 *
 *   <map zoom="13" center="34.04924594193164, -118.24104309082031">
 *     <bicycling-layer></bicycling-layer>
 *    </map>
 */
(function() {
  'use strict';
  var parser;

  var linkFunc = function(scope, element, attrs, mapController) {
    mapController = mapController[0]||mapController[1];
    var orgAttrs = parser.orgAttributes(element);
    var filtered = parser.filter(attrs);
    var options = parser.getOptions(filtered, {scope: scope});
    var events = parser.getEvents(scope, filtered);

    console.log('bicycling-layer options', options, 'events', events);

    var layer = getLayer(options, events);
    mapController.addObject('bicyclingLayers', layer);
    mapController.observeAttrSetObj(orgAttrs, attrs, layer);  //observers
    element.bind('$destroy', function() {
      mapController.deleteObject('bicyclingLayers', layer);
    });
  };

  var getLayer = function(options, events) {
    var layer = new google.maps.BicyclingLayer(options);
    for (var eventName in events) {
      google.maps.event.addListener(layer, eventName, events[eventName]);
    }
    return layer;
  };

  var bicyclingLayer= function(Attr2MapOptions) {
    parser = Attr2MapOptions;
    return {
      restrict: 'E',
      require: ['?^map','?^ngMap'],
      link: linkFunc
     };
  };
  bicyclingLayer.$inject = ['Attr2MapOptions'];

  angular.module('ngMap').directive('bicyclingLayer', bicyclingLayer);
})();

(function() {
  'use strict';

  angular
  .module('ngMap')
  .directive('customControl', customControl);

  DirectiveController.inject = ['$q', '$scope','$compile', '$element'];
  function DirectiveController($q, $scope, $compile, $element) {
    var vm = this;

    //Wait for NgMapDirective to resolve the map
    vm.parentPromise = $q.defer();
    vm.mapReady = vm.parentPromise.promise;

    console.log('customToolsDirective::Init', vm);
    console.log('customToolsDirective::Element', $element);

    //var customContolEl = $element[0].innerHTML;
    //$element[0].remove();
    $element.hide();


    vm.mapReady
      .then(function (ngMap) {
        vm.ngMap = ngMap;

        console.log('CustomControlElement', $element);

        //$compile(customControlEl.innerHTML.trim())($scope);
        ngMap.map.controls[google.maps.ControlPosition[vm.position]].push($element.get()[0]);
        console.log('displayingcustomTool!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        ngMap.map.controls[google.maps.ControlPosition[vm.position]].getAt(0).style.display = 'initial';
        console.log('GoogleCustomControl', ngMap.map.controls[google.maps.ControlPosition[vm.position]]);
        ngMap.customControls.push(vm.position);

      });


    $element.bind('$destroy', function() {
      //console.log('DestroyCustomControls', Map.customControls);
      vm.ngMap.map.controls[google.maps.ControlPosition[vm.position]].clear();
      vm.ngMap.customControls.splice(vm.ngMap.customControls.indexOf(vm.position));
    });

    /*
    //If we need a watcher in the future
    $scope.$watch('vm.ngmapData', function(newData, oldData) {
      if (newData !== oldData) {

      }
    });
    */

  }

  function customControl() {
    var directive = {
      restrict: 'E',
      require: ['^ngMap'],
      scope: {
        position: '@'
      },
      controller: DirectiveController,
      controllerAs: 'vm',
      bindToController: true,
      link: function(scope, iElement, iAttrs, parentController) {
        parentController[0].mapRendered
          .then(function (map) {
            scope.vm.parentPromise.resolve(map);
          });
      }
    };

    return directive;
  }

 })();

/**
 * @ngdoc directive
 * @memberof ngmap
 * @name custom-marker
 * @param Attr2Options {service} convert html attribute to Gogole map api options
 * @param $timeout {service} AngularJS $timeout
 * @description
 *   Marker with html
 *   Requires:  map directive
 *   Restrict To:  Element
 *
 * @attr {String} position required, position on map
 * @attr {Number} z-index optional
 * @attr {Boolean} visible optional
 * @example
 *
 * Example:
 *   <map center="41.850033,-87.6500523" zoom="3">
 *     <custom-marker position="41.850033,-87.6500523">
 *       <div>
 *         <b>Home</b>
 *       </div>
 *     </custom-marker>
 *   </map>
 *
 */
/* global document */
(function() {
  'use strict';
  var parser, $timeout, $compile, NgMap;

  var CustomMarker = function(options) {
    options = options || {};

    this.el = document.createElement('div');
    this.el.style.display = 'inline-block';
    this.el.style.visibility = "hidden";
    this.visible = true;
    for (var key in options) { /* jshint ignore:line */
     this[key] = options[key];
    }
  };

  var setCustomMarker = function() {

    CustomMarker.prototype = new google.maps.OverlayView();

    CustomMarker.prototype.setContent = function(html, scope) {
      this.el.innerHTML = html;
      this.el.style.position = 'absolute';
      if (scope) {
        $compile(angular.element(this.el).contents())(scope);
      }
    };

    CustomMarker.prototype.getDraggable = function() {
      return this.draggable;
    };

    CustomMarker.prototype.setDraggable = function(draggable) {
      this.draggable = draggable;
    };

    CustomMarker.prototype.getPosition = function() {
      return this.position;
    };

    CustomMarker.prototype.setPosition = function(position) {
      position && (this.position = position); /* jshint ignore:line */

      if (this.getProjection() && typeof this.position.lng == 'function') {
        var posPixel = this.getProjection().fromLatLngToDivPixel(this.position);
        var _this = this;
        var setPosition = function() {
          var x = Math.round(posPixel.x - (_this.el.offsetWidth/2));
          var y = Math.round(posPixel.y - _this.el.offsetHeight - 10); // 10px for anchor
          _this.el.style.left = x + "px";
          _this.el.style.top = y + "px";
          _this.el.style.visibility = "visible";
        };
        if (_this.el.offsetWidth && _this.el.offsetHeight) { 
          setPosition();
        } else {
          //delayed left/top calculation when width/height are not set instantly
          $timeout(setPosition, 300);
        }
      }
    };

    CustomMarker.prototype.setZIndex = function(zIndex) {
      zIndex && (this.zIndex = zIndex); /* jshint ignore:line */
      this.el.style.zIndex = this.zIndex;
    };

    CustomMarker.prototype.setVisible = function(visible) {
      this.el.style.display = visible ? 'inline-block' : 'none';
      this.visible = visible;
    };

    CustomMarker.prototype.addClass = function(className) {
      var classNames = this.el.className.trim().split(' ');
      (classNames.indexOf(className) == -1) && classNames.push(className); /* jshint ignore:line */
      this.el.className = classNames.join(' ');
    };

    CustomMarker.prototype.removeClass = function(className) {
      var classNames = this.el.className.split(' ');
      var index = classNames.indexOf(className);
      (index > -1) && classNames.splice(index, 1); /* jshint ignore:line */
      this.el.className = classNames.join(' ');
    };

    CustomMarker.prototype.onAdd = function() {
      this.getPanes().overlayMouseTarget.appendChild(this.el);
    };

    CustomMarker.prototype.draw = function() {
      this.setPosition();
      this.setZIndex(this.zIndex);
      this.setVisible(this.visible);
    };

    CustomMarker.prototype.onRemove = function() {
      this.el.parentNode.removeChild(this.el);
      //this.el = null;
    };
  };

  var linkFunc = function(orgHtml, varsToWatch) {
    //console.log('orgHtml', orgHtml, 'varsToWatch', varsToWatch);

    return function(scope, element, attrs, mapController) {
      mapController = mapController[0]||mapController[1];
      var orgAttrs = parser.orgAttributes(element);

      var filtered = parser.filter(attrs);
      var options = parser.getOptions(filtered, {scope: scope});
      var events = parser.getEvents(scope, filtered);

      /**
       * build a custom marker element
       */
      element[0].style.display = 'none';
      console.log("custom-marker options", options);
      var customMarker = new CustomMarker(options);

      $timeout(function() { //apply contents, class, and location after it is compiled
        scope.$watch('[' + varsToWatch.join(',') + ']', function() {
          customMarker.setContent(orgHtml, scope);
        });

        customMarker.setContent(element[0].innerHTML, scope);
        var classNames = element[0].firstElementChild.className;
        customMarker.addClass('custom-marker');
        customMarker.addClass(classNames);
        console.log('customMarker', customMarker, 'classNames', classNames);

        if (!(options.position instanceof google.maps.LatLng)) {
          NgMap.getGeoLocation(options.position).then(
            function(latlng) {
              customMarker.setPosition(latlng);
            }
          );
        }
      });

      console.log("custom-marker events", "events");
      for (var eventName in events) { /* jshint ignore:line */
        google.maps.event.addDomListener(
          customMarker.el, eventName, events[eventName]);
      }
      mapController.addObject('customMarkers', customMarker);

      //set observers
      mapController.observeAttrSetObj(orgAttrs, attrs, customMarker);

      element.bind('$destroy', function() {
        //Is it required to remove event listeners when DOM is removed?
        mapController.deleteObject('customMarkers', customMarker);
      });

    }; // linkFunc
  };


  var customMarkerDirective = function(
      _$timeout_, _$compile_, Attr2MapOptions, _NgMap_
    )  {
    parser = Attr2MapOptions;
    $timeout = _$timeout_;
    $compile = _$compile_;
    NgMap = _NgMap_;

    return {
      restrict: 'E',
      require: ['?^map','?^ngMap'],
      compile: function(element) {
        setCustomMarker();
        element[0].style.display ='none';
        var orgHtml = element.html();
        var matches = orgHtml.match(/{{([^}]+)}}/g);
        var varsToWatch = [];
        //filter out that contains '::', 'this.'
        (matches || []).forEach(function(match) {
          var toWatch = match.replace('{{','').replace('}}','');
          if (match.indexOf('::') == -1 &&
            match.indexOf('this.') == -1 &&
            varsToWatch.indexOf(toWatch) == -1) {
            varsToWatch.push(match.replace('{{','').replace('}}',''));
          }
        });

        return linkFunc(orgHtml, varsToWatch);
      }
    }; // return
  };// function
  customMarkerDirective.$inject =
    ['$timeout', '$compile', 'Attr2MapOptions', 'NgMap'];

  angular.module('ngMap').directive('customMarker', customMarkerDirective);
})();

/**
 * @ngdoc directive
 * @name directions
 * @description
 *   Enable directions on map.
 *   e.g., origin, destination, draggable, waypoints, etc
 *
 *   Requires:  map directive
 *
 *   Restrict To:  Element
 *
 * @attr {String} DirectionsRendererOptions
 *   [Any DirectionsRendererOptions](https://developers.google.com/maps/documentation/javascript/reference#DirectionsRendererOptions)
 * @attr {String} DirectionsRequestOptions
 *   [Any DirectionsRequest options](https://developers.google.com/maps/documentation/javascript/reference#DirectionsRequest)
 * @example
 *  <map zoom="14" center="37.7699298, -122.4469157">
 *    <directions
 *      draggable="true"
 *      panel="directions-panel"
 *      travel-mode="{{travelMode}}"
 *      waypoints="[{location:'kingston', stopover:true}]"
 *      origin="{{origin}}"
 *      destination="{{destination}}">
 *    </directions>
 *  </map>
 */
/* global document */
(function() {
  'use strict';
  var NgMap, $timeout, NavigatorGeolocation;

  var getDirectionsRenderer = function(options, events) {
    if (options.panel) {
      options.panel = document.getElementById(options.panel) ||
        document.querySelector(options.panel);
    }
    var renderer = new google.maps.DirectionsRenderer(options);
    for (var eventName in events) {
      google.maps.event.addListener(renderer, eventName, events[eventName]);
    }
    return renderer;
  };

  var updateRoute = function(renderer, options) {
    var directionsService = new google.maps.DirectionsService();

    /* filter out valid keys only for DirectionsRequest object*/
    var request = options;
    request.travelMode = request.travelMode || 'DRIVING';
    var validKeys = [
      'origin', 'destination', 'travelMode', 'transitOptions', 'unitSystem',
      'durationInTraffic', 'waypoints', 'optimizeWaypoints', 
      'provideRouteAlternatives', 'avoidHighways', 'avoidTolls', 'region'
    ];
    for(var key in request){
      (validKeys.indexOf(key) === -1) && (delete request[key]);
    }

    if(request.waypoints) {
      // Check fo valid values
      if(request.waypoints == "[]" || request.waypoints === "") {
        delete request.waypoints;
      }
    }

    var showDirections = function(request) {
      directionsService.route(request, function(response, status) {
        if (status == google.maps.DirectionsStatus.OK) {
          $timeout(function() {
            renderer.setDirections(response);
          });
        }
      });
    };

    if (request.origin && request.destination) {
      if (request.origin == 'current-location') {
        NavigatorGeolocation.getCurrentPosition().then(function(ll) {
          request.origin = new google.maps.LatLng(ll.coords.latitude, ll.coords.longitude);
          showDirections(request);
        });
      } else if (request.destination == 'current-location') {
        NavigatorGeolocation.getCurrentPosition().then(function(ll) {
          request.destination = new google.maps.LatLng(ll.coords.latitude, ll.coords.longitude);
          showDirections(request);
        });
      } else {
        showDirections(request);
      }
    }
  };

  var directions = function(
      Attr2MapOptions, _$timeout_, _NavigatorGeolocation_, _NgMap_) {
    var parser = Attr2MapOptions;
    NgMap = _NgMap_;
    $timeout = _$timeout_;
    NavigatorGeolocation = _NavigatorGeolocation_;

    var linkFunc = function(scope, element, attrs, mapController) {
      mapController = mapController[0]||mapController[1];

      var orgAttrs = parser.orgAttributes(element);
      var filtered = parser.filter(attrs);
      var options = parser.getOptions(filtered, {scope: scope});
      var events = parser.getEvents(scope, filtered);
      var attrsToObserve = parser.getAttrsToObserve(orgAttrs);

      var renderer = getDirectionsRenderer(options, events);
      mapController.addObject('directionsRenderers', renderer);

      attrsToObserve.forEach(function(attrName) {
        (function(attrName) {
          attrs.$observe(attrName, function(val) {
            if (attrName == 'panel') {
              $timeout(function(){
                var panel =
                  document.getElementById(val) || document.querySelector(val);
                console.log('setting ', attrName, 'with value', panel);
                panel && renderer.setPanel(panel);
              });
            } else if (options[attrName] !== val) { //apply only if changed
              var optionValue = parser.toOptionValue(val, {key: attrName});
              console.log('setting ', attrName, 'with value', optionValue);
              options[attrName] = optionValue;
              updateRoute(renderer, options);
            }
          });
        })(attrName);
      });

      NgMap.getMap().then(function() {
        updateRoute(renderer, options);
      });
      element.bind('$destroy', function() {
        mapController.deleteObject('directionsRenderers', renderer);
      });
    };

    return {
      restrict: 'E',
      require: ['?^map','?^ngMap'],
      link: linkFunc
    };
  }; // var directions
  directions.$inject =
    ['Attr2MapOptions', '$timeout', 'NavigatorGeolocation', 'NgMap'];

  angular.module('ngMap').directive('directions', directions);
})();


/**
 * @ngdoc directive
 * @name drawing-manager
 * @param Attr2Options {service} convert html attribute to Gogole map api options
 * @description
 *   Requires:  map directive
 *   Restrict To:  Element
 *
 * @example
 * Example:
 *
 *  <map zoom="13" center="37.774546, -122.433523" map-type-id="SATELLITE">
 *    <drawing-manager
 *      on-overlaycomplete="onMapOverlayCompleted()"
 *      position="ControlPosition.TOP_CENTER"
 *      drawingModes="POLYGON,CIRCLE"
 *      drawingControl="true"
 *      circleOptions="fillColor: '#FFFF00';fillOpacity: 1;strokeWeight: 5;clickable: false;zIndex: 1;editable: true;" >
 *    </drawing-manager>
 *  </map>
 *
 *  TODO: Add remove button.
 *  currently, for our solution, we have the shapes/markers in our own
 *  controller, and we use some css classes to change the shape button
 *  to a remove button (<div>X</div>) and have the remove operation in our own controller.
 */
(function() {
  'use strict';
  angular.module('ngMap').directive('drawingManager', [
    'Attr2MapOptions', function(Attr2MapOptions) {
    var parser = Attr2MapOptions;

    return {
      restrict: 'E',
      require: ['?^map','?^ngMap'],

      link: function(scope, element, attrs, mapController) {
        mapController = mapController[0]||mapController[1];

        var filtered = parser.filter(attrs);
        var options = parser.getOptions(filtered, {scope: scope});
        var controlOptions = parser.getControlOptions(filtered);
        var events = parser.getEvents(scope, filtered);

        /**
         * set options
         */
        var drawingManager = new google.maps.drawing.DrawingManager({
          drawingMode: options.drawingmode,
          drawingControl: options.drawingcontrol,
          drawingControlOptions: controlOptions.drawingControlOptions,
          circleOptions:options.circleoptions,
          markerOptions:options.markeroptions,
          polygonOptions:options.polygonoptions,
          polylineOptions:options.polylineoptions,
          rectangleOptions:options.rectangleoptions
        });

        //Observers
        attrs.$observe('drawingControlOptions', function (newValue) {
          drawingManager.drawingControlOptions = parser.getControlOptions({drawingControlOptions: newValue}).drawingControlOptions;
          drawingManager.setDrawingMode(null);
          drawingManager.setMap(mapController.map);
        });


        /**
         * set events
         */
        for (var eventName in events) {
          google.maps.event.addListener(drawingManager, eventName, events[eventName]);
        }

        mapController.addObject('mapDrawingManager', drawingManager);

        element.bind('$destroy', function() {
          mapController.deleteObject('mapDrawingManager', drawingManager);
        });
      }
    }; // return
  }]);
})();

/**
 * @ngdoc directive
 * @name dynamic-maps-engine-layer
 * @description
 *   Requires:  map directive
 *   Restrict To:  Element
 *
 * @example
 * Example:
 *   <map zoom="14" center="[59.322506, 18.010025]">
 *     <dynamic-maps-engine-layer
 *       layer-id="06673056454046135537-08896501997766553811">
 *     </dynamic-maps-engine-layer>
 *    </map>
 */
(function() {
  'use strict';

  angular.module('ngMap').directive('dynamicMapsEngineLayer', [
    'Attr2MapOptions', function(Attr2MapOptions) {
    var parser = Attr2MapOptions;

    var getDynamicMapsEngineLayer = function(options, events) {
      var layer = new google.maps.visualization.DynamicMapsEngineLayer(options);

      for (var eventName in events) {
        google.maps.event.addListener(layer, eventName, events[eventName]);
      }

      return layer;
    };

    return {
      restrict: 'E',
      require: ['?^map','?^ngMap'],

      link: function(scope, element, attrs, mapController) {
        mapController = mapController[0]||mapController[1];

        var filtered = parser.filter(attrs);
        var options = parser.getOptions(filtered, {scope: scope});
        var events = parser.getEvents(scope, filtered, events);

        var layer = getDynamicMapsEngineLayer(options, events);
        mapController.addObject('mapsEngineLayers', layer);
      }
     }; // return
  }]);
})();

/**
 * @ngdoc directive
 * @name fusion-tables-layer
 * @description
 *   Requires:  map directive
 *   Restrict To:  Element
 *
 * @example
 * Example:
 *   <map zoom="11" center="41.850033, -87.6500523">
 *     <fusion-tables-layer query="{
 *       select: 'Geocodable address',
 *       from: '1mZ53Z70NsChnBMm-qEYmSDOvLXgrreLTkQUvvg'}">
 *     </fusion-tables-layer>
 *   </map>
 */
(function() {
  'use strict';

  angular.module('ngMap').directive('fusionTablesLayer', [
    'Attr2MapOptions', function(Attr2MapOptions) {
    var parser = Attr2MapOptions;

    var getLayer = function(options, events) {
      var layer = new google.maps.FusionTablesLayer(options);

      for (var eventName in events) {
        google.maps.event.addListener(layer, eventName, events[eventName]);
      }

      return layer;
    };

    return {
      restrict: 'E',
      require: ['?^map','?^ngMap'],

      link: function(scope, element, attrs, mapController) {
        mapController = mapController[0]||mapController[1];

        var filtered = parser.filter(attrs);
        var options = parser.getOptions(filtered, {scope: scope});
        var events = parser.getEvents(scope, filtered, events);
        console.log('fusion-tables-layer options', options, 'events', events);

        var layer = getLayer(options, events);
        mapController.addObject('fusionTablesLayers', layer);
      }
     }; // return
  }]);
})();

(function() {
  'use strict';

  angular
  .module('ngMap')
  .directive('heatmapLayer', heatmapLayer);

  DirectiveController.inject = ['$q', '$scope', 'NgMap'];
  function DirectiveController($q, $scope, NgMap) {
    var vm = this;

    //Wait for NgMapDirective to resolve the map
    vm.parentPromise = $q.defer();
    vm.mapReady = vm.parentPromise.promise;


    console.log('heatmapLayerDirective::Init', vm);
    vm.mapReady.then(function (map) {
      map.getHeatmap(vm.ngmapHeatmapId)
        .then(function (heatmap) {
          vm.heatmap = heatmap;
        });
    });

    //Set Events
    if (vm.ngmapEvents) {
      vm.mapReady.then(function (map) {
        map.setEvents(vm.ngmapEvents);
      });
    }

    $scope.$watch('vm.ngmapData', function(newData, oldData) {
      if (newData !== oldData) {
        console.log('Heatmap Data Changed', newData);
        vm.mapReady.then(function (map) {
          //console.log(vm.heatmap);
          if (!vm.heatmap) {
            vm.heatmap = new google.maps.visualization.HeatmapLayer({ data: newData, radius: vm.radius || 25 });
            console.log('New Heatmap', vm.heatmap);
            map.addHeatmap({ id: vm.ngmapHeatmapId, heatmap: vm.heatmap });
          } else {
            console.log('Existing Heatmap', vm.heatmap);
            vm.heatmap.setData(newData);
          }
        });
      }
    });

    $scope.$watch('vm.radius', function(newData, oldData) {
      if (newData !== oldData) {
        console.log('Radius Changed', newData);
        vm.mapReady.then(function () {
          vm.heatmap.setOptions({ radius: newData });
        });
      }
    });

  }

  function heatmapLayer() {
    var directive = {
      restrict: 'E',
      require: ['^ngMap'],
      scope: {
        ngmapHeatmapId: '@',
        ngmapData: '=',
        ngmapEvents: '=',
        radius: '='
      },
      controller: DirectiveController,
      controllerAs: 'vm',
      bindToController: true,
      link: function(scope, iElement, iAttrs, parentController) {
        parentController[0].mapReady
          .then(function (map) {
            scope.vm.parentPromise.resolve(map);
          });
      }
    };

    return directive;
  }

 })();

/**
 * @ngdoc directive
 * @name info-window
 * @param Attr2MapOptions {service}
 *   convert html attribute to Gogole map api options
 * @param $compile {service} $compile service
 * @description
 *  Defines infoWindow and provides compile method
 *
 *  Requires:  map directive
 *
 *  Restrict To:  Element
 *
 *  NOTE: this directive should **NOT** be used with `ng-repeat`
 *  because InfoWindow itself is a template, and a template must be
 *  reused by each marker, thus, should not be redefined repeatedly
 *  by `ng-repeat`.
 *
 * @attr {Boolean} visible
 *   Indicates to show it when map is initialized
 * @attr {Boolean} visible-on-marker
 *   Indicates to show it on a marker when map is initialized
 * @attr {Expression} geo-callback
 *   if position is an address, the expression is will be performed
 *   when geo-lookup is successful. e.g., geo-callback="showDetail()"
 * @attr {String} &lt;InfoWindowOption> Any InfoWindow options,
 *   https://developers.google.com/maps/documentation/javascript/reference?csw=1#InfoWindowOptions
 * @attr {String} &lt;InfoWindowEvent> Any InfoWindow events,
 *   https://developers.google.com/maps/documentation/javascript/reference
 * @example
 * Usage:
 *   <map MAP_ATTRIBUTES>
 *    <info-window id="foo" ANY_OPTIONS ANY_EVENTS"></info-window>
 *   </map>
 *
 * Example:
 *  <map center="41.850033,-87.6500523" zoom="3">
 *    <info-window id="1" position="41.850033,-87.6500523" >
 *      <div ng-non-bindable>
 *        Chicago, IL<br/>
 *        LatLng: {{chicago.lat()}}, {{chicago.lng()}}, <br/>
 *        World Coordinate: {{worldCoordinate.x}}, {{worldCoordinate.y}}, <br/>
 *        Pixel Coordinate: {{pixelCoordinate.x}}, {{pixelCoordinate.y}}, <br/>
 *        Tile Coordinate: {{tileCoordinate.x}}, {{tileCoordinate.y}} at Zoom Level {{map.getZoom()}}
 *      </div>
 *    </info-window>
 *  </map>
 */
/* global google */
(function() {
  'use strict';

  var infoWindow = function(Attr2MapOptions, $compile, $timeout, $parse, NgMap)  {
    var parser = Attr2MapOptions;

    var getInfoWindow = function(options, events, element) {
      var infoWindow;

      /**
       * set options
       */
      if (options.position && !(options.position instanceof google.maps.LatLng)) {
        delete options.position;
      }
      infoWindow = new google.maps.InfoWindow(options);

      /**
       * set events
       */
      for (var eventName in events) {
        if (eventName) {
          google.maps.event.addListener(infoWindow, eventName, events[eventName]);
        }
      }

      /**
       * set template ane template-relate functions
       * it must have a container element with ng-non-bindable
       */
      var template = element.html().trim();
      if (angular.element(template).length != 1) {
        throw "info-window working as a template must have a container";
      }
      infoWindow.__template = template.replace(/\s?ng-non-bindable[='"]+/,"");

      infoWindow.__open = function(map, scope, anchor) {
        $timeout(function() {
          anchor && (scope.anchor = anchor);
          var el = $compile(infoWindow.__template)(scope);
          infoWindow.setContent(el[0]);
          scope.$apply();
          if (anchor && anchor.getPosition) {
            infoWindow.open(map, anchor);
          } else if (anchor && anchor instanceof google.maps.LatLng) {
            infoWindow.open(map);
            infoWindow.setPosition(anchor);
          } else {
            infoWindow.open(map);
          }
          var infoWindowContainerEl = infoWindow.content.parentElement.parentElement.parentElement;
          infoWindowContainerEl.className = "ng-map-info-window";
        });
      };

      return infoWindow;
    };

    var linkFunc = function(scope, element, attrs, mapController) {
      mapController = mapController[0]||mapController[1];

      element.css('display','none');

      var orgAttrs = parser.orgAttributes(element);
      var filtered = parser.filter(attrs);
      var options = parser.getOptions(filtered, {scope: scope});
      var events = parser.getEvents(scope, filtered);

      var address;
      if (options.position && !(options.position instanceof google.maps.LatLng)) {
        address = options.position;
      }
      var infoWindow = getInfoWindow(options, events, element);
      if (address) {
        NgMap.getGeoLocation(address).then(function(latlng) {
          infoWindow.setPosition(latlng);
          infoWindow.__open(mapController.map, scope, latlng);
          var geoCallback = attrs.geoCallback;
          geoCallback && $parse(geoCallback)(scope);
        });
      }

      mapController.addObject('infoWindows', infoWindow);
      mapController.observeAttrSetObj(orgAttrs, attrs, infoWindow);

      mapController.showInfoWindow = 
      mapController.map.showInfoWindow = mapController.showInfoWindow ||
        function(p1, p2, p3) { //event, id, marker
          var id = typeof p1 == 'string' ? p1 : p2;
          var marker = typeof p1 == 'string' ? p2 : p3;
          if (typeof marker == 'string') {
            //Check if markers if defined to avoid odd 'undefined' errors
            if (typeof mapController.map.markers != "undefined"
                && typeof mapController.map.markers[marker] != "undefined") {
              marker = mapController.map.markers[marker];
            } else if (
                //additionally check if that marker is a custom marker
            typeof mapController.map.customMarkers
            && typeof mapController.map.customMarkers[marker] != "undefined") {
              marker = mapController.map.customMarkers[marker];
            } else {
              //Better error output if marker with that id is not defined
              throw new Error("Cant open info window for id " + marker + ". Marker or CustomMarker is not defined")
            }
          }

          var infoWindow = mapController.map.infoWindows[id];
          var anchor = marker ? marker : (this.getPosition ? this : null);
          infoWindow.__open(mapController.map, scope, anchor);
          if(mapController.singleInfoWindow) {
            if(mapController.lastInfoWindow) {
              scope.hideInfoWindow(mapController.lastInfoWindow);
            }
            mapController.lastInfoWindow = id;
          }
        };

      mapController.hideInfoWindow =
      mapController.map.hideInfoWindow = mapController.hideInfoWindow ||
        function(p1, p2) {
          var id = typeof p1 == 'string' ? p1 : p2;
          var infoWindow = mapController.map.infoWindows[id];
          infoWindow.close();
        };

      //TODO DEPRECATED
      scope.showInfoWindow = mapController.map.showInfoWindow;
      scope.hideInfoWindow = mapController.map.hideInfoWindow;

      NgMap.getMap().then(function(map) {
        infoWindow.visible && infoWindow.__open(map, scope);
        if (infoWindow.visibleOnMarker) {
          var markerId = infoWindow.visibleOnMarker;
          infoWindow.__open(map, scope, map.markers[markerId]);
        }
      });

    }; //link

    return {
      restrict: 'E',
      require: ['?^map','?^ngMap'],
      link: linkFunc
    };

  }; // infoWindow
  infoWindow.$inject =
    ['Attr2MapOptions', '$compile', '$timeout', '$parse', 'NgMap'];

  angular.module('ngMap').directive('infoWindow', infoWindow);
})();

/**
 * @ngdoc directive
 * @name kml-layer
 * @param Attr2MapOptions {service} convert html attribute to Gogole map api options
 * @description
 *   renders Kml layer on a map
 *   Requires:  map directive
 *   Restrict To:  Element
 *
 * @attr {Url} url url of the kml layer
 * @attr {KmlLayerOptions} KmlLayerOptions
 *   (https://developers.google.com/maps/documentation/javascript/reference#KmlLayerOptions) 
 * @attr {String} &lt;KmlLayerEvent> Any KmlLayer events,
 *   https://developers.google.com/maps/documentation/javascript/reference
 * @example
 * Usage:
 *   <map MAP_ATTRIBUTES>
 *    <kml-layer ANY_KML_LAYER ANY_KML_LAYER_EVENTS"></kml-layer>
 *   </map>
 *
 * Example:
 *
 * <map zoom="11" center="[41.875696,-87.624207]">
 *   <kml-layer url="https://gmaps-samples.googlecode.com/svn/trunk/ggeoxml/cta.kml" >
 *   </kml-layer>
 * </map>
 */
(function() {
  'use strict';

  angular.module('ngMap').directive('kmlLayer', [
    'Attr2MapOptions', function(Attr2MapOptions) {
    var parser = Attr2MapOptions;

    var getKmlLayer = function(options, events) {
      var kmlLayer = new google.maps.KmlLayer(options);
      for (var eventName in events) {
        google.maps.event.addListener(kmlLayer, eventName, events[eventName]);
      }
      return kmlLayer;
    };

    return {
      restrict: 'E',
      require: ['?^map','?^ngMap'],

      link: function(scope, element, attrs, mapController) {
        mapController = mapController[0]||mapController[1];

        var orgAttrs = parser.orgAttributes(element);
        var filtered = parser.filter(attrs);
        var options = parser.getOptions(filtered, {scope: scope});
        var events = parser.getEvents(scope, filtered);
        console.log('kml-layer options', options, 'events', events);

        var kmlLayer = getKmlLayer(options, events);
        mapController.addObject('kmlLayers', kmlLayer);
        mapController.observeAttrSetObj(orgAttrs, attrs, kmlLayer);  //observers
        element.bind('$destroy', function() {
          mapController.deleteObject('kmlLayers', kmlLayer);
        });
      }
     }; // return
  }]);
})();

/**
 * @ngdoc directive
 * @name map-data
 * @param Attr2MapOptions {service}
 *   convert html attribute to Gogole map api options
 * @description
 *   set map data
 *   Requires:  map directive
 *   Restrict To:  Element
 *
 * @wn {String} method-name, run map.data[method-name] with attribute value
 * @example
 * Example:
 *
 *  <map zoom="11" center="[41.875696,-87.624207]">
 *    <map-data load-geo-json="https://storage.googleapis.com/maps-devrel/google.json"></map-data>
 *   </map>
 */
(function() {
  'use strict';

  angular.module('ngMap').directive('mapData', [
    'Attr2MapOptions', 'NgMap', function(Attr2MapOptions, NgMap) {
    var parser = Attr2MapOptions;
    return {
      restrict: 'E',
      require: ['?^map','?^ngMap'],

      link: function(scope, element, attrs) {
        var filtered = parser.filter(attrs);
        var options = parser.getOptions(filtered, {scope: scope});
        var events = parser.getEvents(scope, filtered, events);

        console.log('map-data options', options);
        NgMap.getMap().then(function(map) {
          //options
          for (var key in options) {
            var val = options[key];
            if (typeof scope[val] === "function") {
              map.data[key](scope[val]);
            } else {
              map.data[key](val);
            }
          }

          //events
          for (var eventName in events) {
            map.data.addListener(eventName, events[eventName]);
          }
        });
      }
     }; // return
  }]);
})();

/**
 * @ngdoc directive
 * @name map-lazy-load
 * @param Attr2Options {service} convert html attribute to Gogole map api options
 * @description
 *  Requires: Delay the initialization of map directive
 *    until the map is ready to be rendered
 *  Restrict To: Attribute
 *
 * @attr {String} map-lazy-load
 *    Maps api script source file location.
 *    Example:
 *      'https://maps.google.com/maps/api/js'
 * @attr {String} map-lazy-load-params
 *   Maps api script source file location via angular scope variable.
 *   Also requires the map-lazy-load attribute to be present in the directive.
 *   Example: In your controller, set
 *     $scope.googleMapsURL = 'https://maps.google.com/maps/api/js?v=3.20&client=XXXXXenter-api-key-hereXXXX'
 *
 * @example
 * Example:
 *
 *   <div map-lazy-load="http://maps.google.com/maps/api/js">
 *     <map center="Brampton" zoom="10">
 *       <marker position="Brampton"></marker>
 *     </map>
 *   </div>
 *
 *   <div map-lazy-load="http://maps.google.com/maps/api/js"
 *        map-lazy-load-params="{{googleMapsUrl}}">
 *     <map center="Brampton" zoom="10">
 *       <marker position="Brampton"></marker>
 *     </map>
 *   </div>
 */
/* global window, document */
(function() {
  'use strict';
  var $timeout, $compile, src, savedHtml;

  var preLinkFunc = function(scope, element, attrs) {
    var mapsUrl = attrs.mapLazyLoadParams || attrs.mapLazyLoad;

    window.lazyLoadCallback = function() {
      console.log('Google maps script loaded:', mapsUrl);
      $timeout(function() { /* give some time to load */
        element.html(savedHtml);
        $compile(element.contents())(scope);
      }, 100);
    };

    if(window.google === undefined || window.google.maps === undefined) {
      var scriptEl = document.createElement('script');
      console.log('Prelinking script loaded,' + src);

      scriptEl.src = mapsUrl +
        (mapsUrl.indexOf('?') > -1 ? '&' : '?') +
        'callback=lazyLoadCallback';

        if (!document.querySelector('script[src="' + scriptEl.src + '"]')) {
          document.body.appendChild(scriptEl);
        }
    } else {
      element.html(savedHtml);
      $compile(element.contents())(scope);
    }
  };

  var compileFunc = function(tElement, tAttrs) {

    (!tAttrs.mapLazyLoad) && console.error('requires src with map-lazy-load');
    savedHtml = tElement.html();
    src = tAttrs.mapLazyLoad;

    /**
     * if already loaded, stop processing it
     */
    if(window.google !== undefined && window.google.maps !== undefined) {
      return false;
    }

    tElement.html('');  // will compile again after script is loaded

    return {
      pre: preLinkFunc
    };
  };

  var mapLazyLoad = function(_$compile_, _$timeout_) {
    $compile = _$compile_, $timeout = _$timeout_;
    return {
      compile: compileFunc
    };
  };
  mapLazyLoad.$inject = ['$compile','$timeout'];

  angular.module('ngMap').directive('mapLazyLoad', mapLazyLoad);
})();

/**
 * @ngdoc directive
 * @name map-type
 * @param Attr2MapOptions {service} 
 *   convert html attribute to Google map api options
 * @description
 *   Requires:  map directive
 *   Restrict To:  Element
 *
 * @example
 * Example:
 *
 *   <map zoom="13" center="34.04924594193164, -118.24104309082031">
 *     <map-type name="coordinate" object="coordinateMapType"></map-type>
 *   </map>
 */
(function() {
  'use strict';

  angular.module('ngMap').directive('mapType', ['$parse', 'NgMap',
    function($parse, NgMap) {

    return {
      restrict: 'E',
      require: ['?^map','?^ngMap'],

      link: function(scope, element, attrs, mapController) {
        mapController = mapController[0]||mapController[1];

        var mapTypeName = attrs.name, mapTypeObject;
        if (!mapTypeName) {
          throw "invalid map-type name";
        }
        mapTypeObject = $parse(attrs.object)(scope);
        if (!mapTypeObject) {
          throw "invalid map-type object";
        }

        NgMap.getMap().then(function(map) {
          map.mapTypes.set(mapTypeName, mapTypeObject);
        });
        mapController.addObject('mapTypes', mapTypeObject);
      }
     }; // return
  }]);
})();

(function() {
  'use strict';

  angular
  .module('ngMap')
  .directive('ngMap', ngMap);

  DirectiveController.$inject = [ '$element', '$attrs', 'NgMapPool', 'lodash', '$scope', '$q', 'NgMap', 'GoogleMapApi'];
  function DirectiveController($element, $attrs, NgMapPool, lodash, $scope, $q, NgMap, GoogleMapApi) {
    var vm = this;


    if (!vm.ngmapId) {
      console.log('You must set ngmap-id');
      return false;
    }

    if (!vm.ngmapClass) {
      console.log('You must set ngmap-class.  This is a CSS class that will set the height of the Google Map.  Ex: .ngMap500 { height: 500px; }');
      return false;
    }




    //This Promise tells the child directives that the map is loaded and they can do their thing
    var mapReady = $q.defer();
    vm.mapReady = mapReady.promise;

    //This Promise tells the child directives that the map is rendered and they can do their thing.  Used in custom controls
    var mapRendered = $q.defer();
    vm.mapRendered = mapRendered.promise;

    console.log('ngMapDirective::Init', vm);


    //Functions
    //Creates a NgMap Instance.
    function createNgMap() {
      return $q(function(resolve, reject) {
        ngMap = new NgMap(vm.ngmapId);
        ngMap.class = vm.ngmapClass;
        ngMap.options = vm.ngmapOptions;
        resolve(ngMap);
      });
    }

    function createGoogleMap(ngMap) {
      return $q(function(resolve, reject) {
        //Create Map div
        var mapDiv = document.createElement("div");

        //Set ngmapClass or height as 300px;
        ((vm.ngmapClass) ? mapDiv.className = vm.ngmapClass : mapDiv.style.height = '300px');

        mapDiv.setAttribute('id', ngMap.id);
        ngMap.div = mapDiv;

        //Add Map Div to element
        $element.append(mapDiv);

        //Merge default options with given options;
        var options = lodash.defaults(vm.ngmapOptions, ngMap.options);

        //Override options with center and zoom if set
        if (vm.ngmapCenter) {
          options.center = vm.ngmapCenter;
        }
        if (vm.ngmapZoom) {
          options.zoom = vm.ngmapZoom;
        }

        ngMap.options = options;

        GoogleMapApi.then(function () {
          ngMap.options.center = new google.maps.LatLng(options.center);
          console.log('Creating Map', ngMap);
          ngMap.map = new google.maps.Map(ngMap.div, ngMap.options);
          ngMap.initMap()
            .then(function () {
              resolve(ngMap);
            });
        });
      });
    }


    NgMapPool
      .findMap(vm.ngmapId)
      //Map Found
      .then(function (ngMap) {
        console.log('MapReturn', ngMap);
        ngMap.ready
          .then(function () {
            $element.append(ngMap.map.getDiv());
            mapReady.resolve(ngMap);
          });
        //Tell everyone the map has rendered
        ngMap.rendered
          .then(function () {
            mapRendered.resolve(ngMap);
          });
      })
      //Map Not Found in pool
      .catch(function () {

        createNgMap()
          .then(createGoogleMap)
          .then(function (ngMap) {
            NgMapPool.addMap(ngMap);
            ngMap.ready
              .then(function () {
                mapReady.resolve(ngMap);
              });
            //Tell everyone the map has rendered
            ngMap.rendered
              .then(function () {
                mapRendered.resolve(ngMap);
              });
          })
          .catch(function (err) {
            console.log('Error Creating Map', err);
          });
      });

      //Watchers
      if (vm.ngmapCenter) {
        $scope.$watch('vm.ngmapCenter', function(newData, oldData) {
          if (newData !== oldData) {
            console.log('Center Changed', newData);
            vm.mapReady.then(function (ngMap) {
              var center = newData;
              if (!(center instanceof google.maps.LatLng)) {
                center = new google.maps.LatLng(newData);
              }
              ngMap.map.setCenter(center);
            });
          }
        });
      }

      if (vm.ngmapZoom) {
        $scope.$watch('vm.ngmapZoom', function(newData, oldData) {
          if (newData !== oldData) {
            console.log('Zoom Changed', newData);
            vm.mapReady.then(function (ngMap) {
              ngMap.map.setZoom(newData);
            });
          }
        });
      }

      if (vm.ngmapOptions) {
        $scope.$watch('vm.ngmapOptions', function(newData, oldData) {
          if (newData !== oldData) {
            console.log('Zoom Changed', newData);
            vm.mapReady.then(function (ngMap) {
              ngMap.map.setOptions(vm.ngmapOptions);
            });
          }
        });
      }

  }

  function ngMap() {
    var directive = {
      restrict: 'AE',
      scope: {
        ngmapId: '@',
        ngmapClass: '@',
        ngmapCenter: '=',
        ngmapZoom: '=',
        ngmapOptions: '='
      },
      controller: DirectiveController,
      controllerAs: 'vm',
      bindToController: true
    };

    return directive;
  }



 })();

/**
 * @ngdoc directive
 * @name maps-engine-layer
 * @description
 *   Requires:  map directive
 *   Restrict To:  Element
 *
 * @example
 * Example:
 *  <map zoom="14" center="[59.322506, 18.010025]">
 *    <maps-engine-layer layer-id="06673056454046135537-08896501997766553811">
 *    </maps-engine-layer>
 *  </map>
 */
(function() {
  'use strict';

  angular.module('ngMap').directive('mapsEngineLayer', ['Attr2MapOptions', function(Attr2MapOptions) {
    var parser = Attr2MapOptions;

    var getMapsEngineLayer = function(options, events) {
      var layer = new google.maps.visualization.MapsEngineLayer(options);

      for (var eventName in events) {
        google.maps.event.addListener(layer, eventName, events[eventName]);
      }

      return layer;
    };

    return {
      restrict: 'E',
      require: ['?^map','?^ngMap'],

      link: function(scope, element, attrs, mapController) {
        mapController = mapController[0]||mapController[1];

        var filtered = parser.filter(attrs);
        var options = parser.getOptions(filtered, {scope: scope});
        var events = parser.getEvents(scope, filtered, events);
        console.log('maps-engine-layer options', options, 'events', events);

        var layer = getMapsEngineLayer(options, events);
        mapController.addObject('mapsEngineLayers', layer);
      }
     }; // return
  }]);
})();

/**
 * @ngdoc directive
 * @name marker
 * @param Attr2Options {service} convert html attribute to Gogole map api options
 * @param NavigatorGeolocation It is used to find the current location
 * @description
 *  Draw a Google map marker on a map with given options and register events
 *
 *  Requires:  map directive
 *
 *  Restrict To:  Element
 *
 * @attr {String} position address, 'current', or [latitude, longitude]
 *  example:
 *    '1600 Pennsylvania Ave, 20500  Washingtion DC',
 *    'current position',
 *    '[40.74, -74.18]'
 * @attr {Boolean} centered if set, map will be centered with this marker
 * @attr {Expression} geo-callback if position is an address,
 *   the expression is will be performed when geo-lookup is successful.
 *   e.g., geo-callback="showStoreInfo()"
 * @attr {Boolean} no-watcher if true, no attribute observer is added.
 *   Useful for many ng-repeat
 * @attr {String} &lt;MarkerOption>
 *   [Any Marker options](https://developers.google.com/maps/documentation/javascript/reference?csw=1#MarkerOptions)
 * @attr {String} &lt;MapEvent>
 *   [Any Marker events](https://developers.google.com/maps/documentation/javascript/reference)
 * @example
 * Usage:
 *   <map MAP_ATTRIBUTES>
 *    <marker ANY_MARKER_OPTIONS ANY_MARKER_EVENTS"></MARKER>
 *   </map>
 *
 * Example:
 *   <map center="[40.74, -74.18]">
 *    <marker position="[40.74, -74.18]" on-click="myfunc()"></div>
 *   </map>
 *
 *   <map center="the cn tower">
 *    <marker position="the cn tower" on-click="myfunc()"></div>
 *   </map>
 */
/* global google */
(function() {
  'use strict';
  var parser, $parse, NgMap;

  var getMarker = function(options, events) {
    var marker;

    if (NgMap.defaultOptions.marker) {
      for (var key in NgMap.defaultOptions.marker) {
        if (typeof options[key] == 'undefined') {
          console.log('setting default marker options', 
            key, NgMap.defaultOptions.marker);
          options[key] = NgMap.defaultOptions.marker[key];
        }
      }
    }

    if (!(options.position instanceof google.maps.LatLng)) {
      options.position = new google.maps.LatLng(0,0);
    }
    marker = new google.maps.Marker(options);

    /**
     * set events
     */
    if (Object.keys(events).length > 0) {
      console.log("markerEvents", events);
    }
    for (var eventName in events) {
      if (eventName) {
        google.maps.event.addListener(marker, eventName, events[eventName]);
      }
    }

    return marker;
  };

  var linkFunc = function(scope, element, attrs, mapController) {
    mapController = mapController[0]||mapController[1];

    var orgAttrs = parser.orgAttributes(element);
    var filtered = parser.filter(attrs);
    var markerOptions = parser.getOptions(filtered, scope, {scope: scope});
    var markerEvents = parser.getEvents(scope, filtered);
    console.log('marker options', markerOptions, 'events', markerEvents);

    var address;
    if (!(markerOptions.position instanceof google.maps.LatLng)) {
      address = markerOptions.position;
    }
    var marker = getMarker(markerOptions, markerEvents);
    mapController.addObject('markers', marker);
    if (address) {
      NgMap.getGeoLocation(address).then(function(latlng) {
        marker.setPosition(latlng);
        markerOptions.centered && marker.map.setCenter(latlng);
        var geoCallback = attrs.geoCallback;
        geoCallback && $parse(geoCallback)(scope);
      });
    }

    //set observers
    mapController.observeAttrSetObj(orgAttrs, attrs, marker); /* observers */

    element.bind('$destroy', function() {
      mapController.deleteObject('markers', marker);
    });
  };

  var marker = function(Attr2MapOptions, _$parse_, _NgMap_) {
    parser = Attr2MapOptions;
    $parse = _$parse_;
    NgMap = _NgMap_;

    return {
      restrict: 'E',
      require: ['^?map','?^ngMap'],
      link: linkFunc
    };
  };

  marker.$inject = ['Attr2MapOptions', '$parse', 'NgMap'];
  angular.module('ngMap').directive('marker', marker);

})();

/**
 * @ngdoc directive
 * @name overlay-map-type
 * @param Attr2MapOptions {service} convert html attribute to Gogole map api options
 * @param $window {service}
 * @description
 *   Requires:  map directive
 *   Restrict To:  Element
 *
 * @example
 * Example:
 *
 * <map zoom="13" center="34.04924594193164, -118.24104309082031">
 *   <overlay-map-type index="0" object="coordinateMapType"></map-type>
 * </map>
 */
(function() {
  'use strict';

  angular.module('ngMap').directive('overlayMapType', [
    'NgMap', function(NgMap) {

    return {
      restrict: 'E',
      require: ['?^map','?^ngMap'],

      link: function(scope, element, attrs, mapController) {
        mapController = mapController[0]||mapController[1];

        var initMethod = attrs.initMethod || "insertAt";
        var overlayMapTypeObject = scope[attrs.object];

        NgMap.getMap().then(function(map) {
          if (initMethod == "insertAt") {
            var index = parseInt(attrs.index, 10);
            map.overlayMapTypes.insertAt(index, overlayMapTypeObject);
          } else if (initMethod == "push") {
            map.overlayMapTypes.push(overlayMapTypeObject);
          }
        });
        mapController.addObject('overlayMapTypes', overlayMapTypeObject);
      }
     }; // return
  }]);
})();

/**
 * @ngdoc directive
 * @name places-auto-complete
 * @param Attr2MapOptions {service} convert html attribute to Gogole map api options
 * @description
 *   Provides address auto complete feature to an input element
 *   Requires: input tag
 *   Restrict To: Attribute
 *
 * @attr {AutoCompleteOptions}
 *   [Any AutocompleteOptions](https://developers.google.com/maps/documentation/javascript/3.exp/reference#AutocompleteOptions)
 *
 * @example
 * Example:
 *   <script src="https://maps.googleapis.com/maps/api/js?libraries=places"></script>
 *   <input places-auto-complete types="['geocode']" on-place-changed="myCallback(place)" />
 */
/* global google */
(function() {
  'use strict';

  var placesAutoComplete = function(Attr2MapOptions, $timeout) {
    var parser = Attr2MapOptions;

    var linkFunc = function(scope, element, attrs, ngModelCtrl) {
      if (attrs.placesAutoComplete ==='false') {
        return false;
      }
      var filtered = parser.filter(attrs);
      var options = parser.getOptions(filtered, {scope: scope});
      var events = parser.getEvents(scope, filtered);
      var autocomplete = new google.maps.places.Autocomplete(element[0], options);
      for (var eventName in events) {
        google.maps.event.addListener(autocomplete, eventName, events[eventName]);
      }

      var updateModel = function() {
        $timeout(function(){
          ngModelCtrl && ngModelCtrl.$setViewValue(element.val());
        },100);
      };
      google.maps.event.addListener(autocomplete, 'place_changed', updateModel);
      element[0].addEventListener('change', updateModel);

      attrs.$observe('types', function(val) {
        if (val) {
          var optionValue = parser.toOptionValue(val, {key: 'types'});
          autocomplete.setTypes(optionValue);
        }
      });
    };

    return {
      restrict: 'A',
      require: '?ngModel',
      link: linkFunc
    };
  };

  placesAutoComplete.$inject = ['Attr2MapOptions', '$timeout'];
  angular.module('ngMap').directive('placesAutoComplete', placesAutoComplete);

})();

/**
 * @ngdoc directive
 * @name shape
 * @param Attr2MapOptions {service} convert html attribute to Gogole map api options
 * @description
 *   Initialize a Google map shape in map with given options and register events
 *   The shapes are:
 *     . circle
 *     . polygon
 *     . polyline
 *     . rectangle
 *     . groundOverlay(or image)
 *
 *   Requires:  map directive
 *
 *   Restrict To:  Element
 *
 * @attr {Boolean} centered if set, map will be centered with this marker
 * @attr {Expression} geo-callback if shape is a circle and the center is
 *   an address, the expression is will be performed when geo-lookup
 *   is successful. e.g., geo-callback="showDetail()"
 * @attr {String} &lt;OPTIONS>
 *   For circle, [any circle options](https://developers.google.com/maps/documentation/javascript/reference#CircleOptions)
 *   For polygon, [any polygon options](https://developers.google.com/maps/documentation/javascript/reference#PolygonOptions)
 *   For polyline, [any polyline options](https://developers.google.com/maps/documentation/javascript/reference#PolylineOptions)
 *   For rectangle, [any rectangle options](https://developers.google.com/maps/documentation/javascript/reference#RectangleOptions)
 *   For image, [any groundOverlay options](https://developers.google.com/maps/documentation/javascript/reference#GroundOverlayOptions)
 * @attr {String} &lt;MapEvent> [Any Shape events](https://developers.google.com/maps/documentation/javascript/reference)
 * @example
 * Usage:
 *   <map MAP_ATTRIBUTES>
 *    <shape name=SHAPE_NAME ANY_SHAPE_OPTIONS ANY_SHAPE_EVENTS"></MARKER>
 *   </map>
 *
 * Example:
 *
 *   <map zoom="11" center="[40.74, -74.18]">
 *     <shape id="polyline" name="polyline" geodesic="true"
 *       stroke-color="#FF0000" stroke-opacity="1.0" stroke-weight="2"
 *       path="[[40.74,-74.18],[40.64,-74.10],[40.54,-74.05],[40.44,-74]]" >
 *     </shape>
 *   </map>
 *
 *   <map zoom="11" center="[40.74, -74.18]">
 *     <shape id="polygon" name="polygon" stroke-color="#FF0000"
 *       stroke-opacity="1.0" stroke-weight="2"
 *       paths="[[40.74,-74.18],[40.64,-74.18],[40.84,-74.08],[40.74,-74.18]]" >
 *     </shape>
 *   </map>
 *
 *   <map zoom="11" center="[40.74, -74.18]">
 *     <shape id="rectangle" name="rectangle" stroke-color='#FF0000'
 *       stroke-opacity="0.8" stroke-weight="2"
 *       bounds="[[40.74,-74.18], [40.78,-74.14]]" editable="true" >
 *     </shape>
 *   </map>
 *
 *   <map zoom="11" center="[40.74, -74.18]">
 *     <shape id="circle" name="circle" stroke-color='#FF0000'
 *       stroke-opacity="0.8"stroke-weight="2"
 *       center="[40.70,-74.14]" radius="4000" editable="true" >
 *     </shape>
 *   </map>
 *
 *   <map zoom="11" center="[40.74, -74.18]">
 *     <shape id="image" name="image"
 *       url="https://www.lib.utexas.edu/maps/historical/newark_nj_1922.jpg"
 *       bounds="[[40.71,-74.22],[40.77,-74.12]]" opacity="0.7"
 *       clickable="true">
 *     </shape>
 *   </map>
 *
 *  For full-working example, please visit
 *    [shape example](https://rawgit.com/allenhwkim/angularjs-google-maps/master/build/shape.html)
 */
/* global google */
(function() {
  'use strict';

  var getShape = function(options, events) {
    var shape;

    var shapeName = options.name;
    delete options.name;  //remove name bcoz it's not for options
    console.log("shape", shapeName, "options", options, 'events', events);

    /**
     * set options
     */
    switch(shapeName) {
      case "circle":
        if (!(options.center instanceof google.maps.LatLng)) {
          options.center = new google.maps.LatLng(0,0);
        } 
        shape = new google.maps.Circle(options);
        break;
      case "polygon":
        shape = new google.maps.Polygon(options);
        break;
      case "polyline":
        shape = new google.maps.Polyline(options);
        break;
      case "rectangle":
        shape = new google.maps.Rectangle(options);
        break;
      case "groundOverlay":
      case "image":
        var url = options.url;
        var opts = {opacity: options.opacity, clickable: options.clickable, id:options.id};
        shape = new google.maps.GroundOverlay(url, options.bounds, opts);
        break;
    }

    /**
     * set events
     */
    for (var eventName in events) {
      if (events[eventName]) {
        google.maps.event.addListener(shape, eventName, events[eventName]);
      }
    }
    return shape;
  };

  var shape = function(Attr2MapOptions, $parse, NgMap) {
    var parser = Attr2MapOptions;

    var linkFunc = function(scope, element, attrs, mapController) {
      mapController = mapController[0]||mapController[1];

      var orgAttrs = parser.orgAttributes(element);
      var filtered = parser.filter(attrs);
      var shapeOptions = parser.getOptions(filtered, {scope: scope});
      var shapeEvents = parser.getEvents(scope, filtered);

      var address, shapeType;
      shapeType = shapeOptions.name;
      if (!(shapeOptions.center instanceof google.maps.LatLng)) {
        address = shapeOptions.center;
      }
      var shape = getShape(shapeOptions, shapeEvents);
      mapController.addObject('shapes', shape);

      if (address && shapeType == 'circle') {
        NgMap.getGeoLocation(address).then(function(latlng) {
          shape.setCenter(latlng);
          shape.centered && shape.map.setCenter(latlng);
          var geoCallback = attrs.geoCallback;
          geoCallback && $parse(geoCallback)(scope);
        });
      }

      //set observers
      mapController.observeAttrSetObj(orgAttrs, attrs, shape);
      element.bind('$destroy', function() {
        mapController.deleteObject('shapes', shape);
      });
    };

    return {
      restrict: 'E',
      require: ['?^map','?^ngMap'],
      link: linkFunc
     }; // return
  };
  shape.$inject = ['Attr2MapOptions', '$parse', 'NgMap'];

  angular.module('ngMap').directive('shape', shape);

})();

/**
 * @ngdoc directive
 * @name streetview-panorama
 * @param Attr2MapOptions {service} convert html attribute to Gogole map api options
 * @description
 *   Requires:  map directive
 *   Restrict To:  Element
 *
 * @attr container Optional, id or css selector, if given, streetview will be in the given html element
 * @attr {String} &lt;StreetViewPanoramaOption>
 *   [Any Google StreetViewPanorama options](https://developers.google.com/maps/documentation/javascript/reference?csw=1#StreetViewPanoramaOptions)
 * @attr {String} &lt;StreetViewPanoramaEvent>
 *   [Any Google StreetViewPanorama events](https://developers.google.com/maps/documentation/javascript/reference#StreetViewPanorama)
 *
 * @example
 *   <map zoom="11" center="[40.688738,-74.043871]" >
 *     <street-view-panorama
 *       click-to-go="true"
 *       disable-default-ui="true"
 *       disable-double-click-zoom="true"
 *       enable-close-button="true"
 *       pano="my-pano"
 *       position="40.688738,-74.043871"
 *       pov="{heading:0, pitch: 90}"
 *       scrollwheel="false"
 *       visible="true">
 *     </street-view-panorama>
 *   </map>
 */
/* global google, document */
(function() {
  'use strict';

  var streetViewPanorama = function(Attr2MapOptions, NgMap) {
    var parser = Attr2MapOptions;

    var getStreetViewPanorama = function(map, options, events) {
      var svp, container;
      if (options.container) {
        container = document.getElementById(options.container);
        container = container || document.querySelector(options.container);
      }
      if (container) {
        svp = new google.maps.StreetViewPanorama(container, options);
      } else {
        svp = map.getStreetView();
        svp.setOptions(options);
      }

      for (var eventName in events) {
        eventName &&
          google.maps.event.addListener(svp, eventName, events[eventName]);
      }
      return svp;
    };

    var linkFunc = function(scope, element, attrs) {
      var filtered = parser.filter(attrs);
      var options = parser.getOptions(filtered, {scope: scope});
      var controlOptions = parser.getControlOptions(filtered);
      var svpOptions = angular.extend(options, controlOptions);

      var svpEvents = parser.getEvents(scope, filtered);
      console.log('street-view-panorama',
        'options', svpOptions, 'events', svpEvents);

      NgMap.getMap().then(function(map) {
        var svp = getStreetViewPanorama(map, svpOptions, svpEvents);

        map.setStreetView(svp);
        (!svp.getPosition()) && svp.setPosition(map.getCenter());
        google.maps.event.addListener(svp, 'position_changed', function() {
          if (svp.getPosition() !== map.getCenter()) {
            map.setCenter(svp.getPosition());
          }
        });
        //needed for geo-callback
        var listener =
          google.maps.event.addListener(map, 'center_changed', function() {
            svp.setPosition(map.getCenter());
            google.maps.event.removeListener(listener);
          });
      });

    }; //link

    return {
      restrict: 'E',
      require: ['?^map','?^ngMap'],
      link: linkFunc
    };

  };
  streetViewPanorama.$inject = ['Attr2MapOptions', 'NgMap'];

  angular.module('ngMap').directive('streetViewPanorama', streetViewPanorama);
})();

/**
 * @ngdoc directive
 * @name traffic-layer
 * @param Attr2MapOptions {service} convert html attribute to Gogole map api options
 * @description
 *   Requires:  map directive
 *   Restrict To:  Element
 *
 * @example
 * Example:
 *
 *   <map zoom="13" center="34.04924594193164, -118.24104309082031">
 *     <traffic-layer></traffic-layer>
 *    </map>
 */
(function() {
  'use strict';

  angular.module('ngMap').directive('trafficLayer', [
    'Attr2MapOptions', function(Attr2MapOptions) {
    var parser = Attr2MapOptions;

    var getLayer = function(options, events) {
      var layer = new google.maps.TrafficLayer(options);
      for (var eventName in events) {
        google.maps.event.addListener(layer, eventName, events[eventName]);
      }
      return layer;
    };

    return {
      restrict: 'E',
      require: ['?^map','?^ngMap'],

      link: function(scope, element, attrs, mapController) {
        mapController = mapController[0]||mapController[1];

        var orgAttrs = parser.orgAttributes(element);
        var filtered = parser.filter(attrs);
        var options = parser.getOptions(filtered, {scope: scope});
        var events = parser.getEvents(scope, filtered);
        console.log('traffic-layer options', options, 'events', events);

        var layer = getLayer(options, events);
        mapController.addObject('trafficLayers', layer);
        mapController.observeAttrSetObj(orgAttrs, attrs, layer);  //observers
        element.bind('$destroy', function() {
          mapController.deleteObject('trafficLayers', layer);
        });
      }
     }; // return
  }]);
})();

/**
 * @ngdoc directive
 * @name transit-layer
 * @param Attr2MapOptions {service} convert html attribute to Gogole map api options
 * @description
 *   Requires:  map directive
 *   Restrict To:  Element
 *
 * @example
 * Example:
 *
 *  <map zoom="13" center="34.04924594193164, -118.24104309082031">
 *    <transit-layer></transit-layer>
 *  </map>
 */
(function() {
  'use strict';

  angular.module('ngMap').directive('transitLayer', [
    'Attr2MapOptions', function(Attr2MapOptions) {
    var parser = Attr2MapOptions;

    var getLayer = function(options, events) {
      var layer = new google.maps.TransitLayer(options);
      for (var eventName in events) {
        google.maps.event.addListener(layer, eventName, events[eventName]);
      }
      return layer;
    };

    return {
      restrict: 'E',
      require: ['?^map','?^ngMap'],

      link: function(scope, element, attrs, mapController) {
        mapController = mapController[0]||mapController[1];

        var orgAttrs = parser.orgAttributes(element);
        var filtered = parser.filter(attrs);
        var options = parser.getOptions(filtered, {scope: scope});
        var events = parser.getEvents(scope, filtered);
        console.log('transit-layer options', options, 'events', events);

        var layer = getLayer(options, events);
        mapController.addObject('transitLayers', layer);
        mapController.observeAttrSetObj(orgAttrs, attrs, layer);  //observers
        element.bind('$destroy', function() {
          mapController.deleteObject('transitLayers', layer);
        });
      }
     }; // return
  }]);
})();

/**
 * @ngdoc filter
 * @name camel-case
 * @description
 *   Converts string to camel cased
 */
(function() {
  'use strict';

  var SPECIAL_CHARS_REGEXP = /([\:\-\_]+(.))/g;
  var MOZ_HACK_REGEXP = /^moz([A-Z])/;

  var camelCaseFilter = function() {
    return function(name) {
      return name.
        replace(SPECIAL_CHARS_REGEXP,
          function(_, separator, letter, offset) {
            return offset ? letter.toUpperCase() : letter;
        }).
        replace(MOZ_HACK_REGEXP, 'Moz$1');
    };
  };

  angular.module('ngMap').filter('camelCase', camelCaseFilter);
})();

/**
 * @ngdoc filter
 * @name jsonize
 * @description
 *   Converts json-like string to json string
 */
(function() {
  'use strict';

  var jsonizeFilter = function() {
    return function(str) {
      try {       // if parsable already, return as it is
        JSON.parse(str);
        return str;
      } catch(e) { // if not parsable, change little
        return str
          // wrap keys without quote with valid double quote
          .replace(/([\$\w]+)\s*:/g,
            function(_, $1) {
              return '"'+$1+'":';
            }
          )
          // replacing single quote wrapped ones to double quote
          .replace(/'([^']+)'/g,
            function(_, $1) {
              return '"'+$1+'"';
            }
          );
      }
    };
  };

  angular.module('ngMap').filter('jsonize', jsonizeFilter);
})();

/**
 * @ngdoc service
 * @name Attr2MapOptions
 * @description
 *   Converts tag attributes to options used by google api v3 objects
 */
/* global google */
(function() {
  'use strict';

  //i.e. "2015-08-12T06:12:40.858Z"
  var isoDateRE =
    /^(\d{4}\-\d\d\-\d\d([tT][\d:\.]*)?)([zZ]|([+\-])(\d\d):?(\d\d))?$/;

  var Attr2MapOptions = function(
      $parse, $timeout, $log, NavigatorGeolocation, GeoCoder,
      camelCaseFilter, jsonizeFilter
    ) {

    /**
     * Returns the attributes of an element as hash
     * @memberof Attr2MapOptions
     * @param {HTMLElement} el html element
     * @returns {Hash} attributes
     */
    var orgAttributes = function(el) {
      (el.length > 0) && (el = el[0]);
      var orgAttributes = {};
      for (var i=0; i<el.attributes.length; i++) {
        var attr = el.attributes[i];
        orgAttributes[attr.name] = attr.value;
      }
      return orgAttributes;
    };

    var getJSON = function(input) {
      var re =/^[\+\-]?[0-9\.]+,[ ]*\ ?[\+\-]?[0-9\.]+$/; //lat,lng
      if (input.match(re)) {
        input = "["+input+"]";
      }
      return JSON.parse(jsonizeFilter(input));
    };

    var getLatLng = function(input) {
      var output = input;
      if (input[0].constructor == Array) { // [[1,2],[3,4]]
        output = input.map(function(el) {
          return new google.maps.LatLng(el[0], el[1]);
        });
      } else if(!isNaN(parseFloat(input[0])) && isFinite(input[0])) {
        output = new google.maps.LatLng(output[0], output[1]);
      }
      return output;
    };

    var toOptionValue = function(input, options) {
      var output;
      try { // 1. Number?
        output = getNumber(input);
      } catch(err) {
        try { // 2. JSON?
          var output = getJSON(input);
          if (output instanceof Array) {
            // [{a:1}] : not lat/lng ones
            if (output[0].constructor == Object) {
              output = output;
            } else { // [[1,2],[3,4]] or [1,2]
              output = getLatLng(output);
            }
          }
          // JSON is an object (not array or null)
          else if (output === Object(output)) {
            // check for nested hashes and convert to Google API options
            var newOptions = options;
            newOptions.doNotConverStringToNumber = true;
            output = getOptions(output, newOptions);
          }
        } catch(err2) {
          // 3. Google Map Object function Expression. i.e. LatLng(80,-49)
          if (input.match(/^[A-Z][a-zA-Z0-9]+\(.*\)$/)) {
            try {
              var exp = "new google.maps."+input;
              output = eval(exp); /* jshint ignore:line */
            } catch(e) {
              output = input;
            }
          // 4. Google Map Object constant Expression. i.e. MayTypeId.HYBRID
          } else if (input.match(/^([A-Z][a-zA-Z0-9]+)\.([A-Z]+)$/)) {
            try {
              var matches = input.match(/^([A-Z][a-zA-Z0-9]+)\.([A-Z]+)$/);
              output = google.maps[matches[1]][matches[2]];
            } catch(e) {
              output = input;
            }
          // 5. Google Map Object constant Expression. i.e. HYBRID
          } else if (input.match(/^[A-Z]+$/)) {
            try {
              var capitalizedKey = options.key.charAt(0).toUpperCase() +
                options.key.slice(1);
              if (options.key.match(/temperatureUnit|windSpeedUnit|labelColor/)) {
                capitalizedKey = capitalizedKey.replace(/s$/,"");
                output = google.maps.weather[capitalizedKey][input];
              } else {
                output = google.maps[capitalizedKey][input];
              }
            } catch(e) {
              output = input;
            }
          // 6. Date Object as ISO String
          } else if (input.match(isoDateRE)) {
            try {
              output = new Date(input);
            } catch(e) {
              output = input;
            }
          // 7. evaluate dynamically bound values
          } else if (input.match(/^{/) && options.scope) {
            try {
              var expr = input.replace(/{{/,'').replace(/}}/g,'');
              output = options.scope.$eval(expr);
            } catch (err) {
              output = input;
            }
          } else {
            output = input;
          }
        } // catch(err2)
      } // catch(err)

      // convert output more for center and position
      if (
        (options.key == 'center' || options.key == 'center') &&
        output instanceof Array
      ) {
        output = new google.maps.LatLng(output[0], output[1]);
      }

      // convert output more for shape bounds
      if (options.key == 'bounds' && output instanceof Array) {
        output = new google.maps.LatLngBounds(output[0], output[1]);
      }

      // convert output more for shape icons
      if (options.key == 'icons' && output instanceof Array) {

        for (var i=0; i<output.length; i++) {
          var el = output[i];
          if (el.icon.path.match(/^[A-Z_]+$/)) {
            el.icon.path =  google.maps.SymbolPath[el.icon.path];
          }
        }
      }

      // convert output more for marker icon
      if (options.key == 'icon' && output instanceof Object) {
        if ((""+output.path).match(/^[A-Z_]+$/)) {
          output.path = google.maps.SymbolPath[output.path];
        }
        for (var key in output) { //jshint ignore:line
          var arr = output[key];
          if (key == "anchor" || key == "origin") {
            output[key] = new google.maps.Point(arr[0], arr[1]);
          } else if (key == "size" || key == "scaledSize") {
            output[key] = new google.maps.Size(arr[0], arr[1]);
          }
        }
      }

      return output;
    };

    var getAttrsToObserve = function(attrs) {
      var attrsToObserve = [];

      if (!attrs.noWatcher) {
        for (var attrName in attrs) { //jshint ignore:line
          var attrValue = attrs[attrName];
          if (attrValue && attrValue.match(/\{\{.*\}\}/)) { // if attr value is {{..}}
            attrsToObserve.push(camelCaseFilter(attrName));
          }
        }
      }

      return attrsToObserve;
    };

    /**
     * filters attributes by skipping angularjs methods $.. $$..
     * @memberof Attr2MapOptions
     * @param {Hash} attrs tag attributes
     * @returns {Hash} filterd attributes
     */
    var filter = function(attrs) {
      var options = {};
      for(var key in attrs) {
        if (key.match(/^\$/) || key.match(/^ng[A-Z]/)) {
          void(0);
        } else {
          options[key] = attrs[key];
        }
      }
      return options;
    };

    /**
     * converts attributes hash to Google Maps API v3 options
     * ```
     *  . converts numbers to number
     *  . converts class-like string to google maps instance
     *    i.e. `LatLng(1,1)` to `new google.maps.LatLng(1,1)`
     *  . converts constant-like string to google maps constant
     *    i.e. `MapTypeId.HYBRID` to `google.maps.MapTypeId.HYBRID`
     *    i.e. `HYBRID"` to `google.maps.MapTypeId.HYBRID`
     * ```
     * @memberof Attr2MapOptions
     * @param {Hash} attrs tag attributes
     * @param {Hash} options
     * @returns {Hash} options converted attributess
     */
    var getOptions = function(attrs, params) {
      params = params || {};
      var options = {};
      for(var key in attrs) {
        if (attrs[key] || attrs[key] === 0) {
          if (key.match(/^on[A-Z]/)) { //skip events, i.e. on-click
            continue;
          } else if (key.match(/ControlOptions$/)) { // skip controlOptions
            continue;
          } else {
            // nested conversions need to be typechecked
            // (non-strings are fully converted)
            if (typeof attrs[key] !== 'string') {
              options[key] = attrs[key];
            } else {
              if (params.doNotConverStringToNumber &&
                attrs[key].match(/^[0-9]+$/)
              ) {
                options[key] = attrs[key];
              } else {
                options[key] = toOptionValue(attrs[key], {key: key, scope: params.scope});
              }
            }
          }
        } // if (attrs[key])
      } // for(var key in attrs)
      return options;
    };

    /**
     * converts attributes hash to scope-specific event function 
     * @memberof Attr2MapOptions
     * @param {scope} scope angularjs scope
     * @param {Hash} attrs tag attributes
     * @returns {Hash} events converted events
     */
    var getEvents = function(scope, attrs) {
      var events = {};
      var toLowercaseFunc = function($1){
        return "_"+$1.toLowerCase();
      };
      var EventFunc = function(attrValue) {
        // funcName(argsStr)
        var matches = attrValue.match(/([^\(]+)\(([^\)]*)\)/);
        var funcName = matches[1];
        var argsStr = matches[2].replace(/event[ ,]*/,'');  //remove string 'event'
        var argsExpr = $parse("["+argsStr+"]"); //for perf when triggering event
        return function(event) {
          var args = argsExpr(scope); //get args here to pass updated model values
          function index(obj,i) {return obj[i];}
          var f = funcName.split('.').reduce(index, scope);
          f && f.apply(this, [event].concat(args));
          $timeout( function() {
            scope.$apply();
          });
        };
      };

      for(var key in attrs) {
        if (attrs[key]) {
          if (!key.match(/^on[A-Z]/)) { //skip if not events
            continue;
          }

          //get event name as underscored. i.e. zoom_changed
          var eventName = key.replace(/^on/,'');
          eventName = eventName.charAt(0).toLowerCase() + eventName.slice(1);
          eventName = eventName.replace(/([A-Z])/g, toLowercaseFunc);

          var attrValue = attrs[key];
          events[eventName] = new EventFunc(attrValue);
        }
      }
      return events;
    };

    /**
     * control means map controls, i.e streetview, pan, etc, not a general control
     * @memberof Attr2MapOptions
     * @param {Hash} filtered filtered tag attributes
     * @returns {Hash} Google Map options
     */
    var getControlOptions = function(filtered) {
      var controlOptions = {};
      if (typeof filtered != 'object') {
        return false;
      }

      for (var attr in filtered) {
        if (filtered[attr]) {
          if (!attr.match(/(.*)ControlOptions$/)) {
            continue; // if not controlOptions, skip it
          }

          //change invalid json to valid one, i.e. {foo:1} to {"foo": 1}
          var orgValue = filtered[attr];
          var newValue = orgValue.replace(/'/g, '"');
          newValue = newValue.replace(/([^"]+)|("[^"]+")/g, function($0, $1, $2) {
            if ($1) {
              return $1.replace(/([a-zA-Z0-9]+?):/g, '"$1":');
            } else {
              return $2;
            }
          });
          try {
            var options = JSON.parse(newValue);
            for (var key in options) { //assign the right values
              if (options[key]) {
                var value = options[key];
                if (typeof value === 'string') {
                  value = value.toUpperCase();
                } else if (key === "mapTypeIds") {
                  value = value.map( function(str) {
                    if (str.match(/^[A-Z]+$/)) { // if constant
                      return google.maps.MapTypeId[str.toUpperCase()];
                    } else { // else, custom map-type
                      return str;
                    }
                  });
                }

                if (key === "style") {
                  var str = attr.charAt(0).toUpperCase() + attr.slice(1);
                  var objName = str.replace(/Options$/,'')+"Style";
                  options[key] = google.maps[objName][value];
                } else if (key === "position") {
                  options[key] = google.maps.ControlPosition[value];
                } else {
                  options[key] = value;
                }
              }
            }
            controlOptions[attr] = options;
          } catch (e) {
            console.error('invald option for', attr, newValue, e, e.stack);
          }
        }
      } // for

      return controlOptions;
    };

    return {
      filter: filter,
      getOptions: getOptions,
      getEvents: getEvents,
      getControlOptions: getControlOptions,
      toOptionValue: toOptionValue,
      getAttrsToObserve: getAttrsToObserve,
      orgAttributes: orgAttributes
    }; // return

  };
  Attr2MapOptions.$inject= [
    '$parse', '$timeout', '$log', 'NavigatorGeolocation', 'GeoCoder',
    'camelCaseFilter', 'jsonizeFilter'
  ];

  angular.module('ngMap').service('Attr2MapOptions', Attr2MapOptions);
})();

/**
 * @ngdoc service
 * @name GeoCoder
 * @description
 *   Provides [defered/promise API](https://docs.angularjs.org/api/ng/service/$q)
 *   service for Google Geocoder service
 */
(function() {
  'use strict';
  var $q;
  /**
   * @memberof GeoCoder
   * @param {Hash} options
   *   https://developers.google.com/maps/documentation/geocoding/#geocoding
   * @example
   * ```
   *   GeoCoder.geocode({address: 'the cn tower'}).then(function(result) {
   *     //... do something with result
   *   });
   * ```
   * @returns {HttpPromise} Future object
   */
  var geocodeFunc = function(options) {
    var deferred = $q.defer();
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode(options, function (results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        deferred.resolve(results);
      } else {
        deferred.reject(status);
      }
    });
    return deferred.promise;
  };

  var GeoCoder = function(_$q_) {
    $q = _$q_;
    return {
      geocode : geocodeFunc
    };
  };
  GeoCoder.$inject = ['$q'];

  angular.module('ngMap').service('GeoCoder', GeoCoder);
})();

(function() {
  'use strict';

  angular
    .module('ngMap')
    .service('GoogleMapApi', GoogleMapApi);


  GoogleMapApi.$inject = [ '$window', '$q' ];
  function GoogleMapApi($window, $q) {
    var deferred = $q.defer();

    // Load Google map API script
    function loadScript() {
        console.log('Loading Script');
        // Use global document since Angular's $document is weak
        var script = document.createElement('script');
        script.src = '//maps.google.com/maps/api/js?libraries=drawing,geometry,visualization&callback=ngMapCallback';
        document.body.appendChild(script);
    }

    // Script loaded callback, send resolve
    $window.ngMapCallback = function () {
      console.log('Script Loaded');
        deferred.resolve();
    }

    loadScript();

    return deferred.promise;
  }
})();

(function() {
  'use strict';

  angular
    .module('ngMap')
    .service('NgMapOptions', NgMapOptions);


  NgMapOptions.$inject = [ '$q', 'lodash' ];
  function NgMapOptions($q, lodash) {

    var service = {
      parseAttributes: parseAttributes
    };

    function parseAttributes(el) {
      return $q(function(resolve, reject) {
        var attributes = el[0].attributes;
        console.log('MapOptions::Parse', attributes);
      });
    }

    return service;

  }

})();

(function() {
  'use strict';

  angular
    .module('ngMap')
    .service('NgMap', NgMap);


  NgMap.$inject = [ '$q', 'lodash' ];
  function NgMap($q, lodash) {

    var ngMap = function (id) {
      var readyPromise = $q.defer();
      var renderedPromise = $q.defer();

      var service = {
        id: id || 'ngmapDefault',
        div: null,
        map: null,
        options: {
          center: { lat: 37.783316, lng: -122.440023 },
          zoom: 4
        },
        heatmaps: [],
        data: [],
        events: [],
        element: null,
        customControls: [],
        ready: readyPromise.promise,
        rendered: renderedPromise.promise,
        initMap: initMap,
        addHeatmap: addHeatmap,
        getHeatmap: getHeatmap,
        setEvents: setEvents,
        getEvent: getEvent,
        resetReady: resetReady
      };

      function resetReady() {
        readyPromise = $q.defer();
      }

      function initMap() {
        return $q(function(resolve, reject) {
          google.maps.event.addListenerOnce(service.map, 'idle', function() {
            console.log('Map is ready Yo!');
            readyPromise.resolve(service.map);
            resolve(service);
          });

          google.maps.event.addListenerOnce(service.map, 'tilesloaded', function() {
            console.log('Map is rendered Yo!');
            renderedPromise.resolve(service);
          });
        });
      }

      function getHeatmap(id) {
        return $q(function(resolve, reject) {
          var heatmap = lodash.find(service.heatmaps, { id: id });
          //console.log('Find HeatMap', heatmap);
          ((heatmap) ? resolve(heatmap.heatmap) : reject());
        });
      }

      function addHeatmap(heatmap) {
        return $q(function(resolve, reject) {
          getHeatmap(heatmap.id)
            .then(function (find) {
              find.setData(heatmap.heatmap.getData());
              //service.heatmaps[service.heatmaps.indexOf(find)] = heatmap;
              resolve(heatmap);
            })
            .catch(function () {
              //console.log('Adding Heatmap', heatmap, Map.map);
              service.heatmaps.push(heatmap);
              heatmap.heatmap.setMap(service.map);
              resolve(heatmap);
            });
        });
      }

      function setEvents(events) {
        return $q(function(resolve, reject) {
          var listener;
          console.log('Setting Events', service.events);
          events.forEach(function (evnt) {
            getEvent(evnt.type)
              .then(function (serviceEvent) {
                console.log('Event Found', serviceEvent);
                google.maps.event.removeListener(serviceEvent.listener);
                listener = google.maps.event.addListener(service.map, evnt.type, evnt.func);
                serviceEvent.listener = listener;
              })
              .catch(function () {
                listener = google.maps.event.addListener(service.map, evnt.type, evnt.func);
                service.events.push({ type: evnt.type, listener: listener })
              });
          });
        });
      }

      function getEvent(type) {
        return $q(function(resolve, reject) {
          console.log('Find Event', type);
          var evnt = lodash.find(service.events, { type: type });
          console.log('Find Event', evnt);
          ((evnt) ? resolve(evnt) : reject());
        });
      }

      return service;
    };

    return ngMap;
  }

})();

/**
 * @ngdoc service
 * @name NavigatorGeolocation
 * @description
 *  Provides [defered/promise API](https://docs.angularjs.org/api/ng/service/$q)
 *  service for navigator.geolocation methods
 */
/* global google */
(function() {
  'use strict';
  var $q;

  /**
   * @memberof NavigatorGeolocation
   * @param {Object} geoLocationOptions the navigator geolocations options.
   *  i.e. { maximumAge: 3000, timeout: 5000, enableHighAccuracy: true }.
   *  If none specified, { timeout: 5000 }. 
   *  If timeout not specified, timeout: 5000 added
   * @param {function} success success callback function
   * @param {function} failure failure callback function
   * @example
   * ```
   *  NavigatorGeolocation.getCurrentPosition()
   *    .then(function(position) {
   *      var lat = position.coords.latitude, lng = position.coords.longitude;
   *      .. do something lat and lng
   *    });
   * ```
   * @returns {HttpPromise} Future object
   */
  var getCurrentPosition = function(geoLocationOptions) {
    var deferred = $q.defer();
    if (navigator.geolocation) {

      if (geoLocationOptions === undefined) {
        geoLocationOptions = { timeout: 5000 };
      }
      else if (geoLocationOptions.timeout === undefined) {
        geoLocationOptions.timeout = 5000;
      }

      navigator.geolocation.getCurrentPosition(
        function(position) {
          deferred.resolve(position);
        }, function(evt) {
          console.error(evt);
          deferred.reject(evt);
        },
        geoLocationOptions
      );
    } else {
      deferred.reject("Browser Geolocation service failed.");
    }
    return deferred.promise;
  };

  var NavigatorGeolocation = function(_$q_) {
    $q = _$q_;
    return {
      getCurrentPosition: getCurrentPosition
    };
  };
  NavigatorGeolocation.$inject = ['$q'];

  angular.module('ngMap').
    service('NavigatorGeolocation', NavigatorGeolocation);
})();

/**
 * @ngdoc provider
 * @name NgMap
 * @description
 *  common utility service for ng-map
 */
(function() {
  'use strict';
  var $window, $document, $q;
  var NavigatorGeolocation, Attr2MapOptions, GeoCoder, camelCaseFilter;

  var mapControllers = {};

  var getStyle = function(el, styleProp) {
    var y;
    if (el.currentStyle) {
      y = el.currentStyle[styleProp];
    } else if ($window.getComputedStyle) {
      y = $document.defaultView.
        getComputedStyle(el, null).
        getPropertyValue(styleProp);
    }
    return y;
  };

  /**
   * @memberof NgMap
   * @function initMap
   * @param id optional, id of the map. default 0
   */
  var initMap = function(id) {
    var ctrl = mapControllers[id || 0];
    if (!(ctrl.map instanceof google.maps.Map)) {
      ctrl.initializeMap();
      return ctrl.map;
    } else {
      console.error('map is already instialized');
    }
  };

  /**
   * @memberof NgMap
   * @function getMap
   * @param {Hash} options optional, e.g., {id: 'foo, timeout: 5000}
   * @returns promise
   */
  var getMap = function(options) {
    options = options || {};
    var deferred = $q.defer();

    var id = options.id || 0;
    var timeout = options.timeout || 2000;

    function waitForMap(timeElapsed){
      if(mapControllers[id]){
        deferred.resolve(mapControllers[id].map);
      } else if (timeElapsed > timeout) {
        deferred.reject('could not find map');
      } else {
        $window.setTimeout( function(){
          waitForMap(timeElapsed+100);
        }, 100);
      }
    }
    waitForMap(0);

    return deferred.promise;
  };

  /**
   * @memberof NgMap
   * @function addMap
   * @param mapController {__MapContoller} a map controller
   * @returns promise
   */
  var addMap = function(mapCtrl) {
    if (mapCtrl.map) {
      var len = Object.keys(mapControllers).length;
      mapControllers[mapCtrl.map.id || len] = mapCtrl;
    }
  };

  /**
   * @memberof NgMap
   * @function deleteMap
   * @param mapController {__MapContoller} a map controller
   */
  var deleteMap = function(mapCtrl) {
    var len = Object.keys(mapControllers).length - 1;
    var mapId = mapCtrl.map.id || len;
    if (mapCtrl.map) {
      for (var eventName in mapCtrl.mapEvents) {
        $log.debug('clearing map events', eventName);
        google.maps.event.clearListeners(mapCtrl.map, eventName);
      }
      if (mapCtrl.map.controls) {
        mapCtrl.map.controls.forEach(function(ctrl) {
          ctrl.clear();
        });
      }
    }

    //Remove Heatmap Layers
    if (mapCtrl.map.heatmapLayers) {
      Object.keys(mapCtrl.map.heatmapLayers).forEach(function (layer) {
        mapCtrl.deleteObject('heatmapLayers', mapCtrl.map.heatmapLayers[layer]);
      });
    }

    delete mapControllers[mapId];
  };

  /**
   * @memberof NgMap
   * @function getGeoLocation
   * @param {String} address
   * @param {Hash} options geo options
   * @returns promise
   */
  var getGeoLocation = function(string, options) {
    var deferred = $q.defer();
    if (!string || string.match(/^current/i)) { // current location
      NavigatorGeolocation.getCurrentPosition(options).then(
        function(position) {
          var lat = position.coords.latitude;
          var lng = position.coords.longitude;
          var latLng = new google.maps.LatLng(lat,lng);
          deferred.resolve(latLng);
        },
        function(error) {
          deferred.reject(error);
        }
      );
    } else {
      GeoCoder.geocode({address: string}).then(
        function(results) {
          deferred.resolve(results[0].geometry.location);
        },
        function(error) {
          deferred.reject(error);
        }
      );
    }

    return deferred.promise;
  };

  /**
   * @memberof NgMap
   * @function observeAndSet
   * @param {String} attrName attribute name
   * @param {Object} object A Google maps object to be changed
   * @returns attribue observe function
   */
  var observeAndSet = function(attrName, object) {
    console.log('observing', attrName, 'on object', object);
    return function(val) {
      if (val) {
        var setMethod = camelCaseFilter('set-'+attrName);
        var optionValue = Attr2MapOptions.toOptionValue(val, {key: attrName});
        if (object[setMethod]) { //if set method does exist
          console.log('observing', attrName, 'and setting', optionValue);
          /* if an location is being observed */
          if (attrName.match(/center|position/) &&
            typeof optionValue == 'string') {
            getGeoLocation(optionValue).then(function(latlng) {
              object[setMethod](latlng);
            });
          } else {
            object[setMethod](optionValue);
          }
        }
      }
    };
  };

  /**
   * @memberof NgMap
   * @function setStyle
   * @param {HtmlElement} map contriner element
   * @desc set display, width, height of map container element
   */
  var setStyle = function(el) {
    //if style is not given to the map element, set display and height
    var defaultStyle = el.getAttribute('default-style');
    if (defaultStyle == "true") {
      el.style.display = 'block';
      el.style.height = '300px';
    } else {
      if (getStyle(el, 'display') != "block") {
        el.style.display = 'block';
      }
      if (getStyle(el, 'height').match(/^(0|auto)/)) {
        el.style.height = '300px';
      }
    }
  };

  angular.module('ngMap').provider('NgMapOld', function() {
    var defaultOptions = {};

    /**
     * @memberof NgMap
     * @function setDefaultOptions
     * @param {Hash} options
     * @example
     *  app.config(function(NgMapProvider) {
     *    NgMapProvider.setDefaultOptions({
     *      marker: {
     *        optimized: false
     *      }
     *    });
     *  });
     */
    this.setDefaultOptions = function(options) {
      defaultOptions = options;
    };

    var NgMap = function(
        _$window_, _$document_, _$q_,
        _NavigatorGeolocation_, _Attr2MapOptions_,
        _GeoCoder_, _camelCaseFilter_
      ) {
      $window = _$window_;
      $document = _$document_[0];
      $q = _$q_;
      NavigatorGeolocation = _NavigatorGeolocation_;
      Attr2MapOptions = _Attr2MapOptions_;
      GeoCoder = _GeoCoder_;
      camelCaseFilter = _camelCaseFilter_;

      return {
        defaultOptions: defaultOptions,
        addMap: addMap,
        deleteMap: deleteMap,
        getMap: getMap,
        initMap: initMap,
        setStyle: setStyle,
        getGeoLocation: getGeoLocation,
        observeAndSet: observeAndSet
      };
    };
    NgMap.$inject = [
      '$window', '$document', '$q',
      'NavigatorGeolocation', 'Attr2MapOptions',
      'GeoCoder', 'camelCaseFilter'
    ];

    this.$get = NgMap;
  });
})();

(function() {
  'use strict';

  angular
    .module('ngMap')
    .service('NgMapPool', NgMapPool);


  NgMapPool.$inject = [ '$q', 'lodash', 'GoogleMapApi', '$interval', 'NgMap', 'NgMapOptions'];
  function NgMapPool($q, lodash, GoogleMapApi, $interval, NgMap, NgMapOptions) {

    //Array of Maps instances
    var maps = [];

    //ngMap instance holder
    var ngMap;

    var factory = {
      getMap: getMap,
      addMap: addMap,
      returnMap: returnMap,
      findMap: findMap
    }

    function findMap (id) {
      return $q(function(resolve, reject) {
        var map = lodash.find(maps, { id: id });
        if (!map) {
          reject();
        }
        resolve(map);
      });
    }



    function getMap(id) {
      return $q(function(resolve, reject) {
        id = id || 'ngmapDefault';
        var map = lodash.find(maps, { id: id });
        if (!map) {
          var i = 10
          //Wait for map to load from directive
          var mapWait = $interval(function () {
            map = lodash.find(maps, { id: id });
            if (map) {
              $interval.cancel(mapWait);
              resolve(map);
            }
          }, 100, i);
          mapWait.then(function (current) {
            if (i >= current) {
              reject('Map Not Found');
            }
          })
        } else {
          resolve(map);
        }
      });
    }



    function addMap(ngMap) {
      return $q(function(resolve, reject) {
        maps.push(ngMap);
      });
    }

    function returnMap(map) {
      console.log(map);
      //map.resetReady();
    }


    return factory;
  }

})();

/**
 * @ngdoc service
 * @name StreetView
 * @description
 *  Provides [defered/promise API](https://docs.angularjs.org/api/ng/service/$q)
 *  service for [Google StreetViewService]
 *  (https://developers.google.com/maps/documentation/javascript/streetview)
 */
(function() {
  'use strict';
  var $q;

  /**
   * Retrieves panorama id from the given map (and or position)
   * @memberof StreetView
   * @param {map} map Google map instance
   * @param {LatLng} latlng Google LatLng instance
   *   default: the center of the map
   * @example
   *   StreetView.getPanorama(map).then(function(panoId) {
   *     $scope.panoId = panoId;
   *   });
   * @returns {HttpPromise} Future object
   */
  var getPanorama = function(map, latlng) {
    latlng = latlng || map.getCenter();
    var deferred = $q.defer();
    var svs = new google.maps.StreetViewService();
    svs.getPanoramaByLocation( (latlng||map.getCenter), 100,
      function (data, status) {
        // if streetView available
        if (status === google.maps.StreetViewStatus.OK) {
          deferred.resolve(data.location.pano);
        } else {
          // no street view available in this range, or some error occurred
          deferred.resolve(false);
          //deferred.reject('Geocoder failed due to: '+ status);
        }
      }
    );
    return deferred.promise;
  };

  /**
   * Set panorama view on the given map with the panorama id
   * @memberof StreetView
   * @param {map} map Google map instance
   * @param {String} panoId Panorama id fro getPanorama method
   * @example
   *   StreetView.setPanorama(map, panoId);
   */
  var setPanorama = function(map, panoId) {
    var svp = new google.maps.StreetViewPanorama(
      map.getDiv(), {enableCloseButton: true}
    );
    svp.setPano(panoId);
  };

  var StreetView = function(_$q_) {
    $q = _$q_;

    return {
      getPanorama: getPanorama,
      setPanorama: setPanorama
    };
  };
  StreetView.$inject = ['$q'];

  angular.module('ngMap').service('StreetView', StreetView);
})();

/**
 * @license
 * lodash 3.10.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern exports="amd,commonjs,node" iife="angular.module('ngLodash', []).constant('lodash', null).config(function ($provide) { %output% $provide.constant('lodash', _);});" --output build/ng-lodash.js`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
angular.module("ngLodash",[]).constant("lodash",null).config(["$provide",function(a){function b(a,b){if(a!==b){var c=null===a,d=a===x,e=a===a,f=null===b,g=b===x,h=b===b;if(a>b&&!f||!e||c&&!g&&h||d&&h)return 1;if(b>a&&!c||!h||f&&!d&&e||g&&e)return-1}return 0}function c(a,b,c){for(var d=a.length,e=c?d:-1;c?e--:++e<d;)if(b(a[e],e,a))return e;return-1}function d(a,b,c){if(b!==b)return o(a,c);for(var d=c-1,e=a.length;++d<e;)if(a[d]===b)return d;return-1}function e(a){return"function"==typeof a||!1}function f(a){return null==a?"":a+""}function g(a,b){for(var c=-1,d=a.length;++c<d&&b.indexOf(a.charAt(c))>-1;);return c}function h(a,b){for(var c=a.length;c--&&b.indexOf(a.charAt(c))>-1;);return c}function i(a,c){return b(a.criteria,c.criteria)||a.index-c.index}function j(a,c,d){for(var e=-1,f=a.criteria,g=c.criteria,h=f.length,i=d.length;++e<h;){var j=b(f[e],g[e]);if(j){if(e>=i)return j;var k=d[e];return j*("asc"===k||k===!0?1:-1)}}return a.index-c.index}function k(a){return Qa[a]}function l(a){return Ra[a]}function m(a,b,c){return b?a=Ua[a]:c&&(a=Va[a]),"\\"+a}function n(a){return"\\"+Va[a]}function o(a,b,c){for(var d=a.length,e=b+(c?0:-1);c?e--:++e<d;){var f=a[e];if(f!==f)return e}return-1}function p(a){return!!a&&"object"==typeof a}function q(a){return 160>=a&&a>=9&&13>=a||32==a||160==a||5760==a||6158==a||a>=8192&&(8202>=a||8232==a||8233==a||8239==a||8287==a||12288==a||65279==a)}function r(a,b){for(var c=-1,d=a.length,e=-1,f=[];++c<d;)a[c]===b&&(a[c]=Q,f[++e]=c);return f}function s(a,b){for(var c,d=-1,e=a.length,f=-1,g=[];++d<e;){var h=a[d],i=b?b(h,d,a):h;d&&c===i||(c=i,g[++f]=h)}return g}function t(a){for(var b=-1,c=a.length;++b<c&&q(a.charCodeAt(b)););return b}function u(a){for(var b=a.length;b--&&q(a.charCodeAt(b)););return b}function v(a){return Sa[a]}function w(a){function q(a){if(p(a)&&!Dh(a)&&!(a instanceof ba)){if(a instanceof _)return a;if(ag.call(a,"__chain__")&&ag.call(a,"__wrapped__"))return md(a)}return new _(a)}function X(){}function _(a,b,c){this.__wrapped__=a,this.__actions__=c||[],this.__chain__=!!b}function ba(a){this.__wrapped__=a,this.__actions__=[],this.__dir__=1,this.__filtered__=!1,this.__iteratees__=[],this.__takeCount__=Bg,this.__views__=[]}function Qa(){var a=new ba(this.__wrapped__);return a.__actions__=cb(this.__actions__),a.__dir__=this.__dir__,a.__filtered__=this.__filtered__,a.__iteratees__=cb(this.__iteratees__),a.__takeCount__=this.__takeCount__,a.__views__=cb(this.__views__),a}function Ra(){if(this.__filtered__){var a=new ba(this);a.__dir__=-1,a.__filtered__=!0}else a=this.clone(),a.__dir__*=-1;return a}function Sa(){var a=this.__wrapped__.value(),b=this.__dir__,c=Dh(a),d=0>b,e=c?a.length:0,f=Tc(0,e,this.__views__),g=f.start,h=f.end,i=h-g,j=d?h:g-1,k=this.__iteratees__,l=k.length,m=0,n=wg(i,this.__takeCount__);if(!c||M>e||e==i&&n==i)return cc(a,this.__actions__);var o=[];a:for(;i--&&n>m;){j+=b;for(var p=-1,q=a[j];++p<l;){var r=k[p],s=r.iteratee,t=r.type,u=s(q);if(t==O)q=u;else if(!u){if(t==N)continue a;break a}}o[m++]=q}return o}function Ta(){this.__data__={}}function Ua(a){return this.has(a)&&delete this.__data__[a]}function Va(a){return"__proto__"==a?x:this.__data__[a]}function Wa(a){return"__proto__"!=a&&ag.call(this.__data__,a)}function Xa(a,b){return"__proto__"!=a&&(this.__data__[a]=b),this}function Ya(a){var b=a?a.length:0;for(this.data={hash:qg(null),set:new kg};b--;)this.push(a[b])}function Za(a,b){var c=a.data,d="string"==typeof b||He(b)?c.set.has(b):c.hash[b];return d?0:-1}function $a(a){var b=this.data;"string"==typeof a||He(a)?b.set.add(a):b.hash[a]=!0}function _a(a,b){for(var c=-1,d=a.length,e=-1,f=b.length,g=Of(d+f);++c<d;)g[c]=a[c];for(;++e<f;)g[c++]=b[e];return g}function cb(a,b){var c=-1,d=a.length;for(b||(b=Of(d));++c<d;)b[c]=a[c];return b}function db(a,b){for(var c=-1,d=a.length;++c<d&&b(a[c],c,a)!==!1;);return a}function eb(a,b){for(var c=a.length;c--&&b(a[c],c,a)!==!1;);return a}function fb(a,b){for(var c=-1,d=a.length;++c<d;)if(!b(a[c],c,a))return!1;return!0}function gb(a,b,c,d){for(var e=-1,f=a.length,g=d,h=g;++e<f;){var i=a[e],j=+b(i);c(j,g)&&(g=j,h=i)}return h}function hb(a,b){for(var c=-1,d=a.length,e=-1,f=[];++c<d;){var g=a[c];b(g,c,a)&&(f[++e]=g)}return f}function ib(a,b){for(var c=-1,d=a.length,e=Of(d);++c<d;)e[c]=b(a[c],c,a);return e}function jb(a,b){for(var c=-1,d=b.length,e=a.length;++c<d;)a[e+c]=b[c];return a}function kb(a,b,c,d){var e=-1,f=a.length;for(d&&f&&(c=a[++e]);++e<f;)c=b(c,a[e],e,a);return c}function lb(a,b,c,d){var e=a.length;for(d&&e&&(c=a[--e]);e--;)c=b(c,a[e],e,a);return c}function mb(a,b){for(var c=-1,d=a.length;++c<d;)if(b(a[c],c,a))return!0;return!1}function nb(a,b){for(var c=a.length,d=0;c--;)d+=+b(a[c])||0;return d}function ob(a,b){return a===x?b:a}function pb(a,b,c,d){return a!==x&&ag.call(d,c)?a:b}function qb(a,b,c){for(var d=-1,e=Oh(b),f=e.length;++d<f;){var g=e[d],h=a[g],i=c(h,b[g],g,a,b);(i===i?i===h:h!==h)&&(h!==x||g in a)||(a[g]=i)}return a}function rb(a,b){return null==b?a:tb(b,Oh(b),a)}function sb(a,b){for(var c=-1,d=null==a,e=!d&&Yc(a),f=e?a.length:0,g=b.length,h=Of(g);++c<g;){var i=b[c];e?h[c]=Zc(i,f)?a[i]:x:h[c]=d?x:a[i]}return h}function tb(a,b,c){c||(c={});for(var d=-1,e=b.length;++d<e;){var f=b[d];c[f]=a[f]}return c}function ub(a,b,c){var d=typeof a;return"function"==d?b===x?a:fc(a,b,c):null==a?Bf:"object"==d?Nb(a):b===x?Hf(a):Ob(a,b)}function vb(a,b,c,d,e,f,g){var h;if(c&&(h=e?c(a,d,e):c(a)),h!==x)return h;if(!He(a))return a;var i=Dh(a);if(i){if(h=Uc(a),!b)return cb(a,h)}else{var j=cg.call(a),k=j==W;if(j!=Z&&j!=R&&(!k||e))return Pa[j]?Wc(a,j,b):e?a:{};if(h=Vc(k?{}:a),!b)return rb(h,a)}f||(f=[]),g||(g=[]);for(var l=f.length;l--;)if(f[l]==a)return g[l];return f.push(a),g.push(h),(i?db:Fb)(a,function(d,e){h[e]=vb(d,b,c,e,a,f,g)}),h}function wb(a,b,c){if("function"!=typeof a)throw new Xf(P);return lg(function(){a.apply(x,c)},b)}function xb(a,b){var c=a?a.length:0,e=[];if(!c)return e;var f=-1,g=Qc(),h=g===d,i=h&&b.length>=M?oc(b):null,j=b.length;i&&(g=Za,h=!1,b=i);a:for(;++f<c;){var k=a[f];if(h&&k===k){for(var l=j;l--;)if(b[l]===k)continue a;e.push(k)}else g(b,k,0)<0&&e.push(k)}return e}function yb(a,b){var c=!0;return Kg(a,function(a,d,e){return c=!!b(a,d,e)}),c}function zb(a,b,c,d){var e=d,f=e;return Kg(a,function(a,g,h){var i=+b(a,g,h);(c(i,e)||i===d&&i===f)&&(e=i,f=a)}),f}function Ab(a,b,c,d){var e=a.length;for(c=null==c?0:+c||0,0>c&&(c=-c>e?0:e+c),d=d===x||d>e?e:+d||0,0>d&&(d+=e),e=c>d?0:d>>>0,c>>>=0;e>c;)a[c++]=b;return a}function Bb(a,b){var c=[];return Kg(a,function(a,d,e){b(a,d,e)&&c.push(a)}),c}function Cb(a,b,c,d){var e;return c(a,function(a,c,f){return b(a,c,f)?(e=d?c:a,!1):void 0}),e}function Db(a,b,c,d){d||(d=[]);for(var e=-1,f=a.length;++e<f;){var g=a[e];p(g)&&Yc(g)&&(c||Dh(g)||ye(g))?b?Db(g,b,c,d):jb(d,g):c||(d[d.length]=g)}return d}function Eb(a,b){return Mg(a,b,_e)}function Fb(a,b){return Mg(a,b,Oh)}function Gb(a,b){return Ng(a,b,Oh)}function Hb(a,b){for(var c=-1,d=b.length,e=-1,f=[];++c<d;){var g=b[c];Ge(a[g])&&(f[++e]=g)}return f}function Ib(a,b,c){if(null!=a){c!==x&&c in kd(a)&&(b=[c]);for(var d=0,e=b.length;null!=a&&e>d;)a=a[b[d++]];return d&&d==e?a:x}}function Jb(a,b,c,d,e,f){return a===b?!0:null==a||null==b||!He(a)&&!p(b)?a!==a&&b!==b:Kb(a,b,Jb,c,d,e,f)}function Kb(a,b,c,d,e,f,g){var h=Dh(a),i=Dh(b),j=S,k=S;h||(j=cg.call(a),j==R?j=Z:j!=Z&&(h=Qe(a))),i||(k=cg.call(b),k==R?k=Z:k!=Z&&(i=Qe(b)));var l=j==Z,m=k==Z,n=j==k;if(n&&!h&&!l)return Mc(a,b,j);if(!e){var o=l&&ag.call(a,"__wrapped__"),p=m&&ag.call(b,"__wrapped__");if(o||p)return c(o?a.value():a,p?b.value():b,d,e,f,g)}if(!n)return!1;f||(f=[]),g||(g=[]);for(var q=f.length;q--;)if(f[q]==a)return g[q]==b;f.push(a),g.push(b);var r=(h?Lc:Nc)(a,b,c,d,e,f,g);return f.pop(),g.pop(),r}function Lb(a,b,c){var d=b.length,e=d,f=!c;if(null==a)return!e;for(a=kd(a);d--;){var g=b[d];if(f&&g[2]?g[1]!==a[g[0]]:!(g[0]in a))return!1}for(;++d<e;){g=b[d];var h=g[0],i=a[h],j=g[1];if(f&&g[2]){if(i===x&&!(h in a))return!1}else{var k=c?c(i,j,h):x;if(!(k===x?Jb(j,i,c,!0):k))return!1}}return!0}function Mb(a,b){var c=-1,d=Yc(a)?Of(a.length):[];return Kg(a,function(a,e,f){d[++c]=b(a,e,f)}),d}function Nb(a){var b=Rc(a);if(1==b.length&&b[0][2]){var c=b[0][0],d=b[0][1];return function(a){return null==a?!1:a[c]===d&&(d!==x||c in kd(a))}}return function(a){return Lb(a,b)}}function Ob(a,b){var c=Dh(a),d=_c(a)&&cd(b),e=a+"";return a=ld(a),function(f){if(null==f)return!1;var g=e;if(f=kd(f),(c||!d)&&!(g in f)){if(f=1==a.length?f:Ib(f,Wb(a,0,-1)),null==f)return!1;g=zd(a),f=kd(f)}return f[g]===b?b!==x||g in f:Jb(b,f[g],x,!0)}}function Pb(a,b,c,d,e){if(!He(a))return a;var f=Yc(b)&&(Dh(b)||Qe(b)),g=f?x:Oh(b);return db(g||b,function(h,i){if(g&&(i=h,h=b[i]),p(h))d||(d=[]),e||(e=[]),Qb(a,b,i,Pb,c,d,e);else{var j=a[i],k=c?c(j,h,i,a,b):x,l=k===x;l&&(k=h),k===x&&(!f||i in a)||!l&&(k===k?k===j:j!==j)||(a[i]=k)}}),a}function Qb(a,b,c,d,e,f,g){for(var h=f.length,i=b[c];h--;)if(f[h]==i)return void(a[c]=g[h]);var j=a[c],k=e?e(j,i,c,a,b):x,l=k===x;l&&(k=i,Yc(i)&&(Dh(i)||Qe(i))?k=Dh(j)?j:Yc(j)?cb(j):[]:Ne(i)||ye(i)?k=ye(j)?Ve(j):Ne(j)?j:{}:l=!1),f.push(i),g.push(k),l?a[c]=d(k,i,e,f,g):(k===k?k!==j:j===j)&&(a[c]=k)}function Rb(a){return function(b){return null==b?x:b[a]}}function Sb(a){var b=a+"";return a=ld(a),function(c){return Ib(c,a,b)}}function Tb(a,b){for(var c=a?b.length:0;c--;){var d=b[c];if(d!=e&&Zc(d)){var e=d;mg.call(a,d,1)}}return a}function Ub(a,b){return a+rg(zg()*(b-a+1))}function Vb(a,b,c,d,e){return e(a,function(a,e,f){c=d?(d=!1,a):b(c,a,e,f)}),c}function Wb(a,b,c){var d=-1,e=a.length;b=null==b?0:+b||0,0>b&&(b=-b>e?0:e+b),c=c===x||c>e?e:+c||0,0>c&&(c+=e),e=b>c?0:c-b>>>0,b>>>=0;for(var f=Of(e);++d<e;)f[d]=a[d+b];return f}function Xb(a,b){var c;return Kg(a,function(a,d,e){return c=b(a,d,e),!c}),!!c}function Yb(a,b){var c=a.length;for(a.sort(b);c--;)a[c]=a[c].value;return a}function Zb(a,b,c){var d=Oc(),e=-1;b=ib(b,function(a){return d(a)});var f=Mb(a,function(a){var c=ib(b,function(b){return b(a)});return{criteria:c,index:++e,value:a}});return Yb(f,function(a,b){return j(a,b,c)})}function $b(a,b){var c=0;return Kg(a,function(a,d,e){c+=+b(a,d,e)||0}),c}function _b(a,b){var c=-1,e=Qc(),f=a.length,g=e===d,h=g&&f>=M,i=h?oc():null,j=[];i?(e=Za,g=!1):(h=!1,i=b?[]:j);a:for(;++c<f;){var k=a[c],l=b?b(k,c,a):k;if(g&&k===k){for(var m=i.length;m--;)if(i[m]===l)continue a;b&&i.push(l),j.push(k)}else e(i,l,0)<0&&((b||h)&&i.push(l),j.push(k))}return j}function ac(a,b){for(var c=-1,d=b.length,e=Of(d);++c<d;)e[c]=a[b[c]];return e}function bc(a,b,c,d){for(var e=a.length,f=d?e:-1;(d?f--:++f<e)&&b(a[f],f,a););return c?Wb(a,d?0:f,d?f+1:e):Wb(a,d?f+1:0,d?e:f)}function cc(a,b){var c=a;c instanceof ba&&(c=c.value());for(var d=-1,e=b.length;++d<e;){var f=b[d];c=f.func.apply(f.thisArg,jb([c],f.args))}return c}function dc(a,b,c){var d=0,e=a?a.length:d;if("number"==typeof b&&b===b&&Eg>=e){for(;e>d;){var f=d+e>>>1,g=a[f];(c?b>=g:b>g)&&null!==g?d=f+1:e=f}return e}return ec(a,b,Bf,c)}function ec(a,b,c,d){b=c(b);for(var e=0,f=a?a.length:0,g=b!==b,h=null===b,i=b===x;f>e;){var j=rg((e+f)/2),k=c(a[j]),l=k!==x,m=k===k;if(g)var n=m||d;else n=h?m&&l&&(d||null!=k):i?m&&(d||l):null==k?!1:d?b>=k:b>k;n?e=j+1:f=j}return wg(f,Dg)}function fc(a,b,c){if("function"!=typeof a)return Bf;if(b===x)return a;switch(c){case 1:return function(c){return a.call(b,c)};case 3:return function(c,d,e){return a.call(b,c,d,e)};case 4:return function(c,d,e,f){return a.call(b,c,d,e,f)};case 5:return function(c,d,e,f,g){return a.call(b,c,d,e,f,g)}}return function(){return a.apply(b,arguments)}}function gc(a){var b=new fg(a.byteLength),c=new ng(b);return c.set(new ng(a)),b}function hc(a,b,c){for(var d=c.length,e=-1,f=vg(a.length-d,0),g=-1,h=b.length,i=Of(h+f);++g<h;)i[g]=b[g];for(;++e<d;)i[c[e]]=a[e];for(;f--;)i[g++]=a[e++];return i}function ic(a,b,c){for(var d=-1,e=c.length,f=-1,g=vg(a.length-e,0),h=-1,i=b.length,j=Of(g+i);++f<g;)j[f]=a[f];for(var k=f;++h<i;)j[k+h]=b[h];for(;++d<e;)j[k+c[d]]=a[f++];return j}function jc(a,b){return function(c,d,e){var f=b?b():{};if(d=Oc(d,e,3),Dh(c))for(var g=-1,h=c.length;++g<h;){var i=c[g];a(f,i,d(i,g,c),c)}else Kg(c,function(b,c,e){a(f,b,d(b,c,e),e)});return f}}function kc(a){return qe(function(b,c){var d=-1,e=null==b?0:c.length,f=e>2?c[e-2]:x,g=e>2?c[2]:x,h=e>1?c[e-1]:x;for("function"==typeof f?(f=fc(f,h,5),e-=2):(f="function"==typeof h?h:x,e-=f?1:0),g&&$c(c[0],c[1],g)&&(f=3>e?x:f,e=1);++d<e;){var i=c[d];i&&a(b,i,f)}return b})}function lc(a,b){return function(c,d){var e=c?Qg(c):0;if(!bd(e))return a(c,d);for(var f=b?e:-1,g=kd(c);(b?f--:++f<e)&&d(g[f],f,g)!==!1;);return c}}function mc(a){return function(b,c,d){for(var e=kd(b),f=d(b),g=f.length,h=a?g:-1;a?h--:++h<g;){var i=f[h];if(c(e[i],i,e)===!1)break}return b}}function nc(a,b){function c(){var e=this&&this!==ab&&this instanceof c?d:a;return e.apply(b,arguments)}var d=qc(a);return c}function oc(a){return qg&&kg?new Ya(a):null}function pc(a){return function(b){for(var c=-1,d=yf(kf(b)),e=d.length,f="";++c<e;)f=a(f,d[c],c);return f}}function qc(a){return function(){var b=arguments;switch(b.length){case 0:return new a;case 1:return new a(b[0]);case 2:return new a(b[0],b[1]);case 3:return new a(b[0],b[1],b[2]);case 4:return new a(b[0],b[1],b[2],b[3]);case 5:return new a(b[0],b[1],b[2],b[3],b[4]);case 6:return new a(b[0],b[1],b[2],b[3],b[4],b[5]);case 7:return new a(b[0],b[1],b[2],b[3],b[4],b[5],b[6])}var c=Jg(a.prototype),d=a.apply(c,b);return He(d)?d:c}}function rc(a){function b(c,d,e){e&&$c(c,d,e)&&(d=x);var f=Kc(c,a,x,x,x,x,x,d);return f.placeholder=b.placeholder,f}return b}function sc(a,b){return qe(function(c){var d=c[0];return null==d?d:(c.push(b),a.apply(x,c))})}function tc(a,b){return function(c,d,e){if(e&&$c(c,d,e)&&(d=x),d=Oc(d,e,3),1==d.length){c=Dh(c)?c:jd(c);var f=gb(c,d,a,b);if(!c.length||f!==b)return f}return zb(c,d,a,b)}}function uc(a,b){return function(d,e,f){if(e=Oc(e,f,3),Dh(d)){var g=c(d,e,b);return g>-1?d[g]:x}return Cb(d,e,a)}}function vc(a){return function(b,d,e){return b&&b.length?(d=Oc(d,e,3),c(b,d,a)):-1}}function wc(a){return function(b,c,d){return c=Oc(c,d,3),Cb(b,c,a,!0)}}function xc(a){return function(){for(var b,c=arguments.length,d=a?c:-1,e=0,f=Of(c);a?d--:++d<c;){var g=f[e++]=arguments[d];if("function"!=typeof g)throw new Xf(P);!b&&_.prototype.thru&&"wrapper"==Pc(g)&&(b=new _([],!0))}for(d=b?-1:c;++d<c;){g=f[d];var h=Pc(g),i="wrapper"==h?Pg(g):x;b=i&&ad(i[0])&&i[1]==(G|C|E|H)&&!i[4].length&&1==i[9]?b[Pc(i[0])].apply(b,i[3]):1==g.length&&ad(g)?b[h]():b.thru(g)}return function(){var a=arguments,d=a[0];if(b&&1==a.length&&Dh(d)&&d.length>=M)return b.plant(d).value();for(var e=0,g=c?f[e].apply(this,a):d;++e<c;)g=f[e].call(this,g);return g}}}function yc(a,b){return function(c,d,e){return"function"==typeof d&&e===x&&Dh(c)?a(c,d):b(c,fc(d,e,3))}}function zc(a){return function(b,c,d){return("function"!=typeof c||d!==x)&&(c=fc(c,d,3)),a(b,c,_e)}}function Ac(a){return function(b,c,d){return("function"!=typeof c||d!==x)&&(c=fc(c,d,3)),a(b,c)}}function Bc(a){return function(b,c,d){var e={};return c=Oc(c,d,3),Fb(b,function(b,d,f){var g=c(b,d,f);d=a?g:d,b=a?b:g,e[d]=b}),e}}function Cc(a){return function(b,c,d){return b=f(b),(a?b:"")+Gc(b,c,d)+(a?"":b)}}function Dc(a){var b=qe(function(c,d){var e=r(d,b.placeholder);return Kc(c,a,x,d,e)});return b}function Ec(a,b){return function(c,d,e,f){var g=arguments.length<3;return"function"==typeof d&&f===x&&Dh(c)?a(c,d,e,g):Vb(c,Oc(d,f,4),e,g,b)}}function Fc(a,b,c,d,e,f,g,h,i,j){function k(){for(var t=arguments.length,u=t,v=Of(t);u--;)v[u]=arguments[u];if(d&&(v=hc(v,d,e)),f&&(v=ic(v,f,g)),o||q){var w=k.placeholder,y=r(v,w);if(t-=y.length,j>t){var B=h?cb(h):x,C=vg(j-t,0),D=o?y:x,G=o?x:y,H=o?v:x,I=o?x:v;b|=o?E:F,b&=~(o?F:E),p||(b&=~(z|A));var J=[a,b,c,H,D,I,G,B,i,C],K=Fc.apply(x,J);return ad(a)&&Rg(K,J),K.placeholder=w,K}}var L=m?c:this,M=n?L[a]:a;return h&&(v=hd(v,h)),l&&i<v.length&&(v.length=i),this&&this!==ab&&this instanceof k&&(M=s||qc(a)),M.apply(L,v)}var l=b&G,m=b&z,n=b&A,o=b&C,p=b&B,q=b&D,s=n?x:qc(a);return k}function Gc(a,b,c){var d=a.length;if(b=+b,d>=b||!tg(b))return"";var e=b-d;return c=null==c?" ":c+"",qf(c,pg(e/c.length)).slice(0,e)}function Hc(a,b,c,d){function e(){for(var b=-1,h=arguments.length,i=-1,j=d.length,k=Of(j+h);++i<j;)k[i]=d[i];for(;h--;)k[i++]=arguments[++b];var l=this&&this!==ab&&this instanceof e?g:a;return l.apply(f?c:this,k)}var f=b&z,g=qc(a);return e}function Ic(a){var b=Sf[a];return function(a,c){return c=c===x?0:+c||0,c?(c=ig(10,c),b(a*c)/c):b(a)}}function Jc(a){return function(b,c,d,e){var f=Oc(d);return null==d&&f===ub?dc(b,c,a):ec(b,c,f(d,e,1),a)}}function Kc(a,b,c,d,e,f,g,h){var i=b&A;if(!i&&"function"!=typeof a)throw new Xf(P);var j=d?d.length:0;if(j||(b&=~(E|F),d=e=x),j-=e?e.length:0,b&F){var k=d,l=e;d=e=x}var m=i?x:Pg(a),n=[a,b,c,d,e,k,l,f,g,h];if(m&&(dd(n,m),b=n[1],h=n[9]),n[9]=null==h?i?0:a.length:vg(h-j,0)||0,b==z)var o=nc(n[0],n[2]);else o=b!=E&&b!=(z|E)||n[4].length?Fc.apply(x,n):Hc.apply(x,n);var p=m?Og:Rg;return p(o,n)}function Lc(a,b,c,d,e,f,g){var h=-1,i=a.length,j=b.length;if(i!=j&&!(e&&j>i))return!1;for(;++h<i;){var k=a[h],l=b[h],m=d?d(e?l:k,e?k:l,h):x;if(m!==x){if(m)continue;return!1}if(e){if(!mb(b,function(a){return k===a||c(k,a,d,e,f,g)}))return!1}else if(k!==l&&!c(k,l,d,e,f,g))return!1}return!0}function Mc(a,b,c){switch(c){case T:case U:return+a==+b;case V:return a.name==b.name&&a.message==b.message;case Y:return a!=+a?b!=+b:a==+b;case $:case aa:return a==b+""}return!1}function Nc(a,b,c,d,e,f,g){var h=Oh(a),i=h.length,j=Oh(b),k=j.length;if(i!=k&&!e)return!1;for(var l=i;l--;){var m=h[l];if(!(e?m in b:ag.call(b,m)))return!1}for(var n=e;++l<i;){m=h[l];var o=a[m],p=b[m],q=d?d(e?p:o,e?o:p,m):x;if(!(q===x?c(o,p,d,e,f,g):q))return!1;n||(n="constructor"==m)}if(!n){var r=a.constructor,s=b.constructor;if(r!=s&&"constructor"in a&&"constructor"in b&&!("function"==typeof r&&r instanceof r&&"function"==typeof s&&s instanceof s))return!1}return!0}function Oc(a,b,c){var d=q.callback||zf;return d=d===zf?ub:d,c?d(a,b,c):d}function Pc(a){for(var b=a.name+"",c=Hg[b],d=c?c.length:0;d--;){var e=c[d],f=e.func;if(null==f||f==a)return e.name}return b}function Qc(a,b,c){var e=q.indexOf||xd;return e=e===xd?d:e,a?e(a,b,c):e}function Rc(a){for(var b=af(a),c=b.length;c--;)b[c][2]=cd(b[c][1]);return b}function Sc(a,b){var c=null==a?x:a[b];return Ke(c)?c:x}function Tc(a,b,c){for(var d=-1,e=c.length;++d<e;){var f=c[d],g=f.size;switch(f.type){case"drop":a+=g;break;case"dropRight":b-=g;break;case"take":b=wg(b,a+g);break;case"takeRight":a=vg(a,b-g)}}return{start:a,end:b}}function Uc(a){var b=a.length,c=new a.constructor(b);return b&&"string"==typeof a[0]&&ag.call(a,"index")&&(c.index=a.index,c.input=a.input),c}function Vc(a){var b=a.constructor;return"function"==typeof b&&b instanceof b||(b=Uf),new b}function Wc(a,b,c){var d=a.constructor;switch(b){case ca:return gc(a);case T:case U:return new d(+a);case da:case ea:case fa:case ga:case ha:case ia:case ja:case ka:case la:var e=a.buffer;return new d(c?gc(e):e,a.byteOffset,a.length);case Y:case aa:return new d(a);case $:var f=new d(a.source,Ea.exec(a));f.lastIndex=a.lastIndex}return f}function Xc(a,b,c){null==a||_c(b,a)||(b=ld(b),a=1==b.length?a:Ib(a,Wb(b,0,-1)),b=zd(b));var d=null==a?a:a[b];return null==d?x:d.apply(a,c)}function Yc(a){return null!=a&&bd(Qg(a))}function Zc(a,b){return a="number"==typeof a||Ha.test(a)?+a:-1,b=null==b?Fg:b,a>-1&&a%1==0&&b>a}function $c(a,b,c){if(!He(c))return!1;var d=typeof b;if("number"==d?Yc(c)&&Zc(b,c.length):"string"==d&&b in c){var e=c[b];return a===a?a===e:e!==e}return!1}function _c(a,b){var c=typeof a;if("string"==c&&xa.test(a)||"number"==c)return!0;if(Dh(a))return!1;var d=!wa.test(a);return d||null!=b&&a in kd(b)}function ad(a){var b=Pc(a),c=q[b];if("function"!=typeof c||!(b in ba.prototype))return!1;if(a===c)return!0;var d=Pg(c);return!!d&&a===d[0]}function bd(a){return"number"==typeof a&&a>-1&&a%1==0&&Fg>=a}function cd(a){return a===a&&!He(a)}function dd(a,b){var c=a[1],d=b[1],e=c|d,f=G>e,g=d==G&&c==C||d==G&&c==H&&a[7].length<=b[8]||d==(G|H)&&c==C;if(!f&&!g)return a;d&z&&(a[2]=b[2],e|=c&z?0:B);var h=b[3];if(h){var i=a[3];a[3]=i?hc(i,h,b[4]):cb(h),a[4]=i?r(a[3],Q):cb(b[4])}return h=b[5],h&&(i=a[5],a[5]=i?ic(i,h,b[6]):cb(h),a[6]=i?r(a[5],Q):cb(b[6])),h=b[7],h&&(a[7]=cb(h)),d&G&&(a[8]=null==a[8]?b[8]:wg(a[8],b[8])),null==a[9]&&(a[9]=b[9]),a[0]=b[0],a[1]=e,a}function ed(a,b){return a===x?b:Eh(a,b,ed)}function fd(a,b){a=kd(a);for(var c=-1,d=b.length,e={};++c<d;){var f=b[c];f in a&&(e[f]=a[f])}return e}function gd(a,b){var c={};return Eb(a,function(a,d,e){b(a,d,e)&&(c[d]=a)}),c}function hd(a,b){for(var c=a.length,d=wg(b.length,c),e=cb(a);d--;){var f=b[d];a[d]=Zc(f,c)?e[f]:x}return a}function id(a){for(var b=_e(a),c=b.length,d=c&&a.length,e=!!d&&bd(d)&&(Dh(a)||ye(a)),f=-1,g=[];++f<c;){var h=b[f];(e&&Zc(h,d)||ag.call(a,h))&&g.push(h)}return g}function jd(a){return null==a?[]:Yc(a)?He(a)?a:Uf(a):ef(a)}function kd(a){return He(a)?a:Uf(a)}function ld(a){if(Dh(a))return a;var b=[];return f(a).replace(ya,function(a,c,d,e){b.push(d?e.replace(Ca,"$1"):c||a)}),b}function md(a){return a instanceof ba?a.clone():new _(a.__wrapped__,a.__chain__,cb(a.__actions__))}function nd(a,b,c){b=(c?$c(a,b,c):null==b)?1:vg(rg(b)||1,1);for(var d=0,e=a?a.length:0,f=-1,g=Of(pg(e/b));e>d;)g[++f]=Wb(a,d,d+=b);return g}function od(a){for(var b=-1,c=a?a.length:0,d=-1,e=[];++b<c;){var f=a[b];f&&(e[++d]=f)}return e}function pd(a,b,c){var d=a?a.length:0;return d?((c?$c(a,b,c):null==b)&&(b=1),Wb(a,0>b?0:b)):[]}function qd(a,b,c){var d=a?a.length:0;return d?((c?$c(a,b,c):null==b)&&(b=1),b=d-(+b||0),Wb(a,0,0>b?0:b)):[]}function rd(a,b,c){return a&&a.length?bc(a,Oc(b,c,3),!0,!0):[]}function sd(a,b,c){return a&&a.length?bc(a,Oc(b,c,3),!0):[]}function td(a,b,c,d){var e=a?a.length:0;return e?(c&&"number"!=typeof c&&$c(a,b,c)&&(c=0,d=e),Ab(a,b,c,d)):[]}function ud(a){return a?a[0]:x}function vd(a,b,c){var d=a?a.length:0;return c&&$c(a,b,c)&&(b=!1),d?Db(a,b):[]}function wd(a){var b=a?a.length:0;return b?Db(a,!0):[]}function xd(a,b,c){var e=a?a.length:0;if(!e)return-1;if("number"==typeof c)c=0>c?vg(e+c,0):c;else if(c){var f=dc(a,b);return e>f&&(b===b?b===a[f]:a[f]!==a[f])?f:-1}return d(a,b,c||0)}function yd(a){return qd(a,1)}function zd(a){var b=a?a.length:0;return b?a[b-1]:x}function Ad(a,b,c){var d=a?a.length:0;if(!d)return-1;var e=d;if("number"==typeof c)e=(0>c?vg(d+c,0):wg(c||0,d-1))+1;else if(c){e=dc(a,b,!0)-1;var f=a[e];return(b===b?b===f:f!==f)?e:-1}if(b!==b)return o(a,e,!0);for(;e--;)if(a[e]===b)return e;return-1}function Bd(){var a=arguments,b=a[0];if(!b||!b.length)return b;for(var c=0,d=Qc(),e=a.length;++c<e;)for(var f=0,g=a[c];(f=d(b,g,f))>-1;)mg.call(b,f,1);return b}function Cd(a,b,c){var d=[];if(!a||!a.length)return d;var e=-1,f=[],g=a.length;for(b=Oc(b,c,3);++e<g;){var h=a[e];b(h,e,a)&&(d.push(h),f.push(e))}return Tb(a,f),d}function Dd(a){return pd(a,1)}function Ed(a,b,c){var d=a?a.length:0;return d?(c&&"number"!=typeof c&&$c(a,b,c)&&(b=0,c=d),Wb(a,b,c)):[]}function Fd(a,b,c){var d=a?a.length:0;return d?((c?$c(a,b,c):null==b)&&(b=1),Wb(a,0,0>b?0:b)):[]}function Gd(a,b,c){var d=a?a.length:0;return d?((c?$c(a,b,c):null==b)&&(b=1),b=d-(+b||0),Wb(a,0>b?0:b)):[]}function Hd(a,b,c){return a&&a.length?bc(a,Oc(b,c,3),!1,!0):[]}function Id(a,b,c){return a&&a.length?bc(a,Oc(b,c,3)):[]}function Jd(a,b,c,e){var f=a?a.length:0;if(!f)return[];null!=b&&"boolean"!=typeof b&&(e=c,c=$c(a,b,e)?x:b,b=!1);var g=Oc();return(null!=c||g!==ub)&&(c=g(c,e,3)),b&&Qc()===d?s(a,c):_b(a,c)}function Kd(a){if(!a||!a.length)return[];var b=-1,c=0;a=hb(a,function(a){return Yc(a)?(c=vg(a.length,c),!0):void 0});for(var d=Of(c);++b<c;)d[b]=ib(a,Rb(b));return d}function Ld(a,b,c){var d=a?a.length:0;if(!d)return[];var e=Kd(a);return null==b?e:(b=fc(b,c,4),ib(e,function(a){return kb(a,b,x,!0)}))}function Md(){for(var a=-1,b=arguments.length;++a<b;){var c=arguments[a];if(Yc(c))var d=d?jb(xb(d,c),xb(c,d)):c}return d?_b(d):[]}function Nd(a,b){var c=-1,d=a?a.length:0,e={};for(!d||b||Dh(a[0])||(b=[]);++c<d;){var f=a[c];b?e[f]=b[c]:f&&(e[f[0]]=f[1])}return e}function Od(a){var b=q(a);return b.__chain__=!0,b}function Pd(a,b,c){return b.call(c,a),a}function Qd(a,b,c){return b.call(c,a)}function Rd(){return Od(this)}function Sd(){return new _(this.value(),this.__chain__)}function Td(a){for(var b,c=this;c instanceof X;){var d=md(c);b?e.__wrapped__=d:b=d;var e=d;c=c.__wrapped__}return e.__wrapped__=a,b}function Ud(){var a=this.__wrapped__,b=function(a){return a.reverse()};if(a instanceof ba){var c=a;return this.__actions__.length&&(c=new ba(this)),c=c.reverse(),c.__actions__.push({func:Qd,args:[b],thisArg:x}),new _(c,this.__chain__)}return this.thru(b)}function Vd(){return this.value()+""}function Wd(){return cc(this.__wrapped__,this.__actions__)}function Xd(a,b,c){var d=Dh(a)?fb:yb;return c&&$c(a,b,c)&&(b=x),("function"!=typeof b||c!==x)&&(b=Oc(b,c,3)),d(a,b)}function Yd(a,b,c){var d=Dh(a)?hb:Bb;return b=Oc(b,c,3),d(a,b)}function Zd(a,b){return eh(a,Nb(b))}function $d(a,b,c,d){var e=a?Qg(a):0;return bd(e)||(a=ef(a),e=a.length),c="number"!=typeof c||d&&$c(b,c,d)?0:0>c?vg(e+c,0):c||0,"string"==typeof a||!Dh(a)&&Pe(a)?e>=c&&a.indexOf(b,c)>-1:!!e&&Qc(a,b,c)>-1}function _d(a,b,c){var d=Dh(a)?ib:Mb;return b=Oc(b,c,3),d(a,b)}function ae(a,b){return _d(a,Hf(b))}function be(a,b,c){var d=Dh(a)?hb:Bb;return b=Oc(b,c,3),d(a,function(a,c,d){return!b(a,c,d)})}function ce(a,b,c){if(c?$c(a,b,c):null==b){a=jd(a);var d=a.length;return d>0?a[Ub(0,d-1)]:x}var e=-1,f=Ue(a),d=f.length,g=d-1;for(b=wg(0>b?0:+b||0,d);++e<b;){var h=Ub(e,g),i=f[h];f[h]=f[e],f[e]=i}return f.length=b,f}function de(a){return ce(a,Bg)}function ee(a){var b=a?Qg(a):0;return bd(b)?b:Oh(a).length}function fe(a,b,c){var d=Dh(a)?mb:Xb;return c&&$c(a,b,c)&&(b=x),("function"!=typeof b||c!==x)&&(b=Oc(b,c,3)),d(a,b)}function ge(a,b,c){if(null==a)return[];c&&$c(a,b,c)&&(b=x);var d=-1;b=Oc(b,c,3);var e=Mb(a,function(a,c,e){return{criteria:b(a,c,e),index:++d,value:a}});return Yb(e,i)}function he(a,b,c,d){return null==a?[]:(d&&$c(b,c,d)&&(c=x),Dh(b)||(b=null==b?[]:[b]),Dh(c)||(c=null==c?[]:[c]),Zb(a,b,c))}function ie(a,b){return Yd(a,Nb(b))}function je(a,b){if("function"!=typeof b){if("function"!=typeof a)throw new Xf(P);var c=a;a=b,b=c}return a=tg(a=+a)?a:0,function(){return--a<1?b.apply(this,arguments):void 0}}function ke(a,b,c){return c&&$c(a,b,c)&&(b=x),b=a&&null==b?a.length:vg(+b||0,0),Kc(a,G,x,x,x,x,b)}function le(a,b){var c;if("function"!=typeof b){if("function"!=typeof a)throw new Xf(P);var d=a;a=b,b=d}return function(){return--a>0&&(c=b.apply(this,arguments)),1>=a&&(b=x),c}}function me(a,b,c){function d(){n&&gg(n),j&&gg(j),p=0,j=n=o=x}function e(b,c){c&&gg(c),j=n=o=x,b&&(p=ph(),k=a.apply(m,i),n||j||(i=m=x))}function f(){var a=b-(ph()-l);0>=a||a>b?e(o,j):n=lg(f,a)}function g(){e(r,n)}function h(){if(i=arguments,l=ph(),m=this,o=r&&(n||!s),q===!1)var c=s&&!n;else{j||s||(p=l);var d=q-(l-p),e=0>=d||d>q;e?(j&&(j=gg(j)),p=l,k=a.apply(m,i)):j||(j=lg(g,d))}return e&&n?n=gg(n):n||b===q||(n=lg(f,b)),c&&(e=!0,k=a.apply(m,i)),!e||n||j||(i=m=x),k}var i,j,k,l,m,n,o,p=0,q=!1,r=!0;if("function"!=typeof a)throw new Xf(P);if(b=0>b?0:+b||0,c===!0){var s=!0;r=!1}else He(c)&&(s=!!c.leading,q="maxWait"in c&&vg(+c.maxWait||0,b),r="trailing"in c?!!c.trailing:r);return h.cancel=d,h}function ne(a,b){if("function"!=typeof a||b&&"function"!=typeof b)throw new Xf(P);var c=function(){var d=arguments,e=b?b.apply(this,d):d[0],f=c.cache;if(f.has(e))return f.get(e);var g=a.apply(this,d);return c.cache=f.set(e,g),g};return c.cache=new ne.Cache,c}function oe(a){if("function"!=typeof a)throw new Xf(P);return function(){return!a.apply(this,arguments)}}function pe(a){return le(2,a)}function qe(a,b){if("function"!=typeof a)throw new Xf(P);return b=vg(b===x?a.length-1:+b||0,0),function(){for(var c=arguments,d=-1,e=vg(c.length-b,0),f=Of(e);++d<e;)f[d]=c[b+d];switch(b){case 0:return a.call(this,f);case 1:return a.call(this,c[0],f);case 2:return a.call(this,c[0],c[1],f)}var g=Of(b+1);for(d=-1;++d<b;)g[d]=c[d];return g[b]=f,a.apply(this,g)}}function re(a){if("function"!=typeof a)throw new Xf(P);return function(b){return a.apply(this,b)}}function se(a,b,c){var d=!0,e=!0;if("function"!=typeof a)throw new Xf(P);return c===!1?d=!1:He(c)&&(d="leading"in c?!!c.leading:d,e="trailing"in c?!!c.trailing:e),me(a,b,{leading:d,maxWait:+b,trailing:e})}function te(a,b){return b=null==b?Bf:b,Kc(b,E,x,[a],[])}function ue(a,b,c,d){return b&&"boolean"!=typeof b&&$c(a,b,c)?b=!1:"function"==typeof b&&(d=c,c=b,b=!1),"function"==typeof c?vb(a,b,fc(c,d,3)):vb(a,b)}function ve(a,b,c){return"function"==typeof b?vb(a,!0,fc(b,c,3)):vb(a,!0)}function we(a,b){return a>b}function xe(a,b){return a>=b}function ye(a){return p(a)&&Yc(a)&&ag.call(a,"callee")&&!jg.call(a,"callee")}function ze(a){return a===!0||a===!1||p(a)&&cg.call(a)==T}function Ae(a){return p(a)&&cg.call(a)==U}function Be(a){return!!a&&1===a.nodeType&&p(a)&&!Ne(a)}function Ce(a){return null==a?!0:Yc(a)&&(Dh(a)||Pe(a)||ye(a)||p(a)&&Ge(a.splice))?!a.length:!Oh(a).length}function De(a,b,c,d){c="function"==typeof c?fc(c,d,3):x;var e=c?c(a,b):x;return e===x?Jb(a,b,c):!!e}function Ee(a){return p(a)&&"string"==typeof a.message&&cg.call(a)==V}function Fe(a){return"number"==typeof a&&tg(a)}function Ge(a){return He(a)&&cg.call(a)==W}function He(a){var b=typeof a;return!!a&&("object"==b||"function"==b)}function Ie(a,b,c,d){return c="function"==typeof c?fc(c,d,3):x,Lb(a,Rc(b),c)}function Je(a){return Me(a)&&a!=+a}function Ke(a){return null==a?!1:Ge(a)?eg.test(_f.call(a)):p(a)&&Ga.test(a)}function Le(a){return null===a}function Me(a){return"number"==typeof a||p(a)&&cg.call(a)==Y}function Ne(a){var b;if(!p(a)||cg.call(a)!=Z||ye(a)||!ag.call(a,"constructor")&&(b=a.constructor,"function"==typeof b&&!(b instanceof b)))return!1;var c;return Eb(a,function(a,b){c=b}),c===x||ag.call(a,c)}function Oe(a){return He(a)&&cg.call(a)==$}function Pe(a){return"string"==typeof a||p(a)&&cg.call(a)==aa}function Qe(a){return p(a)&&bd(a.length)&&!!Oa[cg.call(a)]}function Re(a){return a===x}function Se(a,b){return b>a}function Te(a,b){return b>=a}function Ue(a){var b=a?Qg(a):0;return bd(b)?b?cb(a):[]:ef(a)}function Ve(a){return tb(a,_e(a))}function We(a,b,c){var d=Jg(a);return c&&$c(a,b,c)&&(b=x),b?rb(d,b):d}function Xe(a){return Hb(a,_e(a))}function Ye(a,b,c){var d=null==a?x:Ib(a,ld(b),b+"");return d===x?c:d}function Ze(a,b){if(null==a)return!1;var c=ag.call(a,b);if(!c&&!_c(b)){if(b=ld(b),a=1==b.length?a:Ib(a,Wb(b,0,-1)),null==a)return!1;b=zd(b),c=ag.call(a,b)}return c||bd(a.length)&&Zc(b,a.length)&&(Dh(a)||ye(a))}function $e(a,b,c){c&&$c(a,b,c)&&(b=x);for(var d=-1,e=Oh(a),f=e.length,g={};++d<f;){var h=e[d],i=a[h];b?ag.call(g,i)?g[i].push(h):g[i]=[h]:g[i]=h}return g}function _e(a){if(null==a)return[];He(a)||(a=Uf(a));var b=a.length;b=b&&bd(b)&&(Dh(a)||ye(a))&&b||0;for(var c=a.constructor,d=-1,e="function"==typeof c&&c.prototype===a,f=Of(b),g=b>0;++d<b;)f[d]=d+"";for(var h in a)g&&Zc(h,b)||"constructor"==h&&(e||!ag.call(a,h))||f.push(h);return f}function af(a){a=kd(a);for(var b=-1,c=Oh(a),d=c.length,e=Of(d);++b<d;){var f=c[b];e[b]=[f,a[f]]}return e}function bf(a,b,c){var d=null==a?x:a[b];return d===x&&(null==a||_c(b,a)||(b=ld(b),a=1==b.length?a:Ib(a,Wb(b,0,-1)),d=null==a?x:a[zd(b)]),d=d===x?c:d),Ge(d)?d.call(a):d}function cf(a,b,c){if(null==a)return a;var d=b+"";b=null!=a[d]||_c(b,a)?[d]:ld(b);for(var e=-1,f=b.length,g=f-1,h=a;null!=h&&++e<f;){var i=b[e];He(h)&&(e==g?h[i]=c:null==h[i]&&(h[i]=Zc(b[e+1])?[]:{})),h=h[i]}return a}function df(a,b,c,d){var e=Dh(a)||Qe(a);if(b=Oc(b,d,4),null==c)if(e||He(a)){var f=a.constructor;c=e?Dh(a)?new f:[]:Jg(Ge(f)?f.prototype:x)}else c={};return(e?db:Fb)(a,function(a,d,e){return b(c,a,d,e)}),c}function ef(a){return ac(a,Oh(a))}function ff(a){return ac(a,_e(a))}function gf(a,b,c){return b=+b||0,c===x?(c=b,b=0):c=+c||0,a>=wg(b,c)&&a<vg(b,c)}function hf(a,b,c){c&&$c(a,b,c)&&(b=c=x);var d=null==a,e=null==b;if(null==c&&(e&&"boolean"==typeof a?(c=a,a=1):"boolean"==typeof b&&(c=b,e=!0)),d&&e&&(b=1,e=!1),a=+a||0,e?(b=a,a=0):b=+b||0,c||a%1||b%1){var f=zg();return wg(a+f*(b-a+hg("1e-"+((f+"").length-1))),b)}return Ub(a,b)}function jf(a){return a=f(a),
a&&a.charAt(0).toUpperCase()+a.slice(1)}function kf(a){return a=f(a),a&&a.replace(Ia,k).replace(Ba,"")}function lf(a,b,c){a=f(a),b+="";var d=a.length;return c=c===x?d:wg(0>c?0:+c||0,d),c-=b.length,c>=0&&a.indexOf(b,c)==c}function mf(a){return a=f(a),a&&sa.test(a)?a.replace(qa,l):a}function nf(a){return a=f(a),a&&Aa.test(a)?a.replace(za,m):a||"(?:)"}function of(a,b,c){a=f(a),b=+b;var d=a.length;if(d>=b||!tg(b))return a;var e=(b-d)/2,g=rg(e),h=pg(e);return c=Gc("",h,c),c.slice(0,g)+a+c}function pf(a,b,c){return(c?$c(a,b,c):null==b)?b=0:b&&(b=+b),a=tf(a),yg(a,b||(Fa.test(a)?16:10))}function qf(a,b){var c="";if(a=f(a),b=+b,1>b||!a||!tg(b))return c;do b%2&&(c+=a),b=rg(b/2),a+=a;while(b);return c}function rf(a,b,c){return a=f(a),c=null==c?0:wg(0>c?0:+c||0,a.length),a.lastIndexOf(b,c)==c}function sf(a,b,c){var d=q.templateSettings;c&&$c(a,b,c)&&(b=c=x),a=f(a),b=qb(rb({},c||b),d,pb);var e=qb(rb({},b.imports),d.imports,pb),g=Oh(e),h=ac(e,g),i,j,k=0,l=b.interpolate||Ja,m="__p += '",o=Vf((b.escape||Ja).source+"|"+l.source+"|"+(l===va?Da:Ja).source+"|"+(b.evaluate||Ja).source+"|$","g"),p="//# sourceURL="+("sourceURL"in b?b.sourceURL:"lodash.templateSources["+ ++Na+"]")+"\n";a.replace(o,function(b,c,d,e,f,g){return d||(d=e),m+=a.slice(k,g).replace(Ka,n),c&&(i=!0,m+="' +\n__e("+c+") +\n'"),f&&(j=!0,m+="';\n"+f+";\n__p += '"),d&&(m+="' +\n((__t = ("+d+")) == null ? '' : __t) +\n'"),k=g+b.length,b}),m+="';\n";var r=b.variable;r||(m="with (obj) {\n"+m+"\n}\n"),m=(j?m.replace(ma,""):m).replace(na,"$1").replace(oa,"$1;"),m="function("+(r||"obj")+") {\n"+(r?"":"obj || (obj = {});\n")+"var __t, __p = ''"+(i?", __e = _.escape":"")+(j?", __j = Array.prototype.join;\nfunction print() { __p += __j.call(arguments, '') }\n":";\n")+m+"return __p\n}";var s=Zh(function(){return Rf(g,p+"return "+m).apply(x,h)});if(s.source=m,Ee(s))throw s;return s}function tf(a,b,c){var d=a;return(a=f(a))?(c?$c(d,b,c):null==b)?a.slice(t(a),u(a)+1):(b+="",a.slice(g(a,b),h(a,b)+1)):a}function uf(a,b,c){var d=a;return a=f(a),a?(c?$c(d,b,c):null==b)?a.slice(t(a)):a.slice(g(a,b+"")):a}function vf(a,b,c){var d=a;return a=f(a),a?(c?$c(d,b,c):null==b)?a.slice(0,u(a)+1):a.slice(0,h(a,b+"")+1):a}function wf(a,b,c){c&&$c(a,b,c)&&(b=x);var d=I,e=J;if(null!=b)if(He(b)){var g="separator"in b?b.separator:g;d="length"in b?+b.length||0:d,e="omission"in b?f(b.omission):e}else d=+b||0;if(a=f(a),d>=a.length)return a;var h=d-e.length;if(1>h)return e;var i=a.slice(0,h);if(null==g)return i+e;if(Oe(g)){if(a.slice(h).search(g)){var j,k,l=a.slice(0,h);for(g.global||(g=Vf(g.source,(Ea.exec(g)||"")+"g")),g.lastIndex=0;j=g.exec(l);)k=j.index;i=i.slice(0,null==k?h:k)}}else if(a.indexOf(g,h)!=h){var m=i.lastIndexOf(g);m>-1&&(i=i.slice(0,m))}return i+e}function xf(a){return a=f(a),a&&ra.test(a)?a.replace(pa,v):a}function yf(a,b,c){return c&&$c(a,b,c)&&(b=x),a=f(a),a.match(b||La)||[]}function zf(a,b,c){return c&&$c(a,b,c)&&(b=x),p(a)?Cf(a):ub(a,b)}function Af(a){return function(){return a}}function Bf(a){return a}function Cf(a){return Nb(vb(a,!0))}function Df(a,b){return Ob(a,vb(b,!0))}function Ef(a,b,c){if(null==c){var d=He(b),e=d?Oh(b):x,f=e&&e.length?Hb(b,e):x;(f?f.length:d)||(f=!1,c=b,b=a,a=this)}f||(f=Hb(b,Oh(b)));var g=!0,h=-1,i=Ge(a),j=f.length;c===!1?g=!1:He(c)&&"chain"in c&&(g=c.chain);for(;++h<j;){var k=f[h],l=b[k];a[k]=l,i&&(a.prototype[k]=function(b){return function(){var c=this.__chain__;if(g||c){var d=a(this.__wrapped__),e=d.__actions__=cb(this.__actions__);return e.push({func:b,args:arguments,thisArg:a}),d.__chain__=c,d}return b.apply(a,jb([this.value()],arguments))}}(l))}return a}function Ff(){return ab._=dg,this}function Gf(){}function Hf(a){return _c(a)?Rb(a):Sb(a)}function If(a){return function(b){return Ib(a,ld(b),b+"")}}function Jf(a,b,c){c&&$c(a,b,c)&&(b=c=x),a=+a||0,c=null==c?1:+c||0,null==b?(b=a,a=0):b=+b||0;for(var d=-1,e=vg(pg((b-a)/(c||1)),0),f=Of(e);++d<e;)f[d]=a,a+=c;return f}function Kf(a,b,c){if(a=rg(a),1>a||!tg(a))return[];var d=-1,e=Of(wg(a,Cg));for(b=fc(b,c,1);++d<a;)Cg>d?e[d]=b(d):b(d);return e}function Lf(a){var b=++bg;return f(a)+b}function Mf(a,b){return(+a||0)+(+b||0)}function Nf(a,b,c){return c&&$c(a,b,c)&&(b=x),b=Oc(b,c,3),1==b.length?nb(Dh(a)?a:jd(a),b):$b(a,b)}a=a?bb.defaults(ab.Object(),a,bb.pick(ab,Ma)):ab;var Of=a.Array,Pf=a.Date,Qf=a.Error,Rf=a.Function,Sf=a.Math,Tf=a.Number,Uf=a.Object,Vf=a.RegExp,Wf=a.String,Xf=a.TypeError,Yf=Of.prototype,Zf=Uf.prototype,$f=Wf.prototype,_f=Rf.prototype.toString,ag=Zf.hasOwnProperty,bg=0,cg=Zf.toString,dg=ab._,eg=Vf("^"+_f.call(ag).replace(/[\\^$.*+?()[\]{}|]/g,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$"),fg=a.ArrayBuffer,gg=a.clearTimeout,hg=a.parseFloat,ig=Sf.pow,jg=Zf.propertyIsEnumerable,kg=Sc(a,"Set"),lg=a.setTimeout,mg=Yf.splice,ng=a.Uint8Array,og=Sc(a,"WeakMap"),pg=Sf.ceil,qg=Sc(Uf,"create"),rg=Sf.floor,sg=Sc(Of,"isArray"),tg=a.isFinite,ug=Sc(Uf,"keys"),vg=Sf.max,wg=Sf.min,xg=Sc(Pf,"now"),yg=a.parseInt,zg=Sf.random,Ag=Tf.NEGATIVE_INFINITY,Bg=Tf.POSITIVE_INFINITY,Cg=4294967295,Dg=Cg-1,Eg=Cg>>>1,Fg=9007199254740991,Gg=og&&new og,Hg={},Ig=q.support={};q.templateSettings={escape:ta,evaluate:ua,interpolate:va,variable:"",imports:{_:q}};var Jg=function(){function a(){}return function(b){if(He(b)){a.prototype=b;var c=new a;a.prototype=x}return c||{}}}(),Kg=lc(Fb),Lg=lc(Gb,!0),Mg=mc(),Ng=mc(!0),Og=Gg?function(a,b){return Gg.set(a,b),a}:Bf,Pg=Gg?function(a){return Gg.get(a)}:Gf,Qg=Rb("length"),Rg=function(){var a=0,b=0;return function(c,d){var e=ph(),f=L-(e-b);if(b=e,f>0){if(++a>=K)return c}else a=0;return Og(c,d)}}(),Sg=qe(function(a,b){return p(a)&&Yc(a)?xb(a,Db(b,!1,!0)):[]}),Tg=vc(),Ug=vc(!0),Vg=qe(function(a){for(var b=a.length,c=b,e=Of(l),f=Qc(),g=f===d,h=[];c--;){var i=a[c]=Yc(i=a[c])?i:[];e[c]=g&&i.length>=120?oc(c&&i):null}var j=a[0],k=-1,l=j?j.length:0,m=e[0];a:for(;++k<l;)if(i=j[k],(m?Za(m,i):f(h,i,0))<0){for(var c=b;--c;){var n=e[c];if((n?Za(n,i):f(a[c],i,0))<0)continue a}m&&m.push(i),h.push(i)}return h}),Wg=qe(function(a,c){c=Db(c);var d=sb(a,c);return Tb(a,c.sort(b)),d}),Xg=Jc(),Yg=Jc(!0),Zg=qe(function(a){return _b(Db(a,!1,!0))}),$g=qe(function(a,b){return Yc(a)?xb(a,b):[]}),_g=qe(Kd),ah=qe(function(a){var b=a.length,c=b>2?a[b-2]:x,d=b>1?a[b-1]:x;return b>2&&"function"==typeof c?b-=2:(c=b>1&&"function"==typeof d?(--b,d):x,d=x),a.length=b,Ld(a,c,d)}),bh=qe(function(a){return a=Db(a),this.thru(function(b){return _a(Dh(b)?b:[kd(b)],a)})}),ch=qe(function(a,b){return sb(a,Db(b))}),dh=jc(function(a,b,c){ag.call(a,c)?++a[c]:a[c]=1}),eh=uc(Kg),fh=uc(Lg,!0),gh=yc(db,Kg),hh=yc(eb,Lg),ih=jc(function(a,b,c){ag.call(a,c)?a[c].push(b):a[c]=[b]}),jh=jc(function(a,b,c){a[c]=b}),kh=qe(function(a,b,c){var d=-1,e="function"==typeof b,f=_c(b),g=Yc(a)?Of(a.length):[];return Kg(a,function(a){var h=e?b:f&&null!=a?a[b]:x;g[++d]=h?h.apply(a,c):Xc(a,b,c)}),g}),lh=jc(function(a,b,c){a[c?0:1].push(b)},function(){return[[],[]]}),mh=Ec(kb,Kg),nh=Ec(lb,Lg),oh=qe(function(a,b){if(null==a)return[];var c=b[2];return c&&$c(b[0],b[1],c)&&(b.length=1),Zb(a,Db(b),[])}),ph=xg||function(){return(new Pf).getTime()},qh=qe(function(a,b,c){var d=z;if(c.length){var e=r(c,qh.placeholder);d|=E}return Kc(a,d,b,c,e)}),rh=qe(function(a,b){b=b.length?Db(b):Xe(a);for(var c=-1,d=b.length;++c<d;){var e=b[c];a[e]=Kc(a[e],z,a)}return a}),sh=qe(function(a,b,c){var d=z|A;if(c.length){var e=r(c,sh.placeholder);d|=E}return Kc(b,d,a,c,e)}),th=rc(C),uh=rc(D),vh=qe(function(a,b){return wb(a,1,b)}),wh=qe(function(a,b,c){return wb(a,b,c)}),xh=xc(),yh=xc(!0),zh=qe(function(a,b){if(b=Db(b),"function"!=typeof a||!fb(b,e))throw new Xf(P);var c=b.length;return qe(function(d){for(var e=wg(d.length,c);e--;)d[e]=b[e](d[e]);return a.apply(this,d)})}),Ah=Dc(E),Bh=Dc(F),Ch=qe(function(a,b){return Kc(a,H,x,x,x,Db(b))}),Dh=sg||function(a){return p(a)&&bd(a.length)&&cg.call(a)==S},Eh=kc(Pb),Fh=kc(function(a,b,c){return c?qb(a,b,c):rb(a,b)}),Gh=sc(Fh,ob),Hh=sc(Eh,ed),Ih=wc(Fb),Jh=wc(Gb),Kh=zc(Mg),Lh=zc(Ng),Mh=Ac(Fb),Nh=Ac(Gb),Oh=ug?function(a){var b=null==a?x:a.constructor;return"function"==typeof b&&b.prototype===a||"function"!=typeof a&&Yc(a)?id(a):He(a)?ug(a):[]}:id,Ph=Bc(!0),Qh=Bc(),Rh=qe(function(a,b){if(null==a)return{};if("function"!=typeof b[0]){var b=ib(Db(b),Wf);return fd(a,xb(_e(a),b))}var c=fc(b[0],b[1],3);return gd(a,function(a,b,d){return!c(a,b,d)})}),Sh=qe(function(a,b){return null==a?{}:"function"==typeof b[0]?gd(a,fc(b[0],b[1],3)):fd(a,Db(b))}),Th=pc(function(a,b,c){return b=b.toLowerCase(),a+(c?b.charAt(0).toUpperCase()+b.slice(1):b)}),Uh=pc(function(a,b,c){return a+(c?"-":"")+b.toLowerCase()}),Vh=Cc(),Wh=Cc(!0),Xh=pc(function(a,b,c){return a+(c?"_":"")+b.toLowerCase()}),Yh=pc(function(a,b,c){return a+(c?" ":"")+(b.charAt(0).toUpperCase()+b.slice(1))}),Zh=qe(function(a,b){try{return a.apply(x,b)}catch(c){return Ee(c)?c:new Qf(c)}}),$h=qe(function(a,b){return function(c){return Xc(c,a,b)}}),_h=qe(function(a,b){return function(c){return Xc(a,c,b)}}),ai=Ic("ceil"),bi=Ic("floor"),ci=tc(we,Ag),di=tc(Se,Bg),ei=Ic("round");return q.prototype=X.prototype,_.prototype=Jg(X.prototype),_.prototype.constructor=_,ba.prototype=Jg(X.prototype),ba.prototype.constructor=ba,Ta.prototype["delete"]=Ua,Ta.prototype.get=Va,Ta.prototype.has=Wa,Ta.prototype.set=Xa,Ya.prototype.push=$a,ne.Cache=Ta,q.after=je,q.ary=ke,q.assign=Fh,q.at=ch,q.before=le,q.bind=qh,q.bindAll=rh,q.bindKey=sh,q.callback=zf,q.chain=Od,q.chunk=nd,q.compact=od,q.constant=Af,q.countBy=dh,q.create=We,q.curry=th,q.curryRight=uh,q.debounce=me,q.defaults=Gh,q.defaultsDeep=Hh,q.defer=vh,q.delay=wh,q.difference=Sg,q.drop=pd,q.dropRight=qd,q.dropRightWhile=rd,q.dropWhile=sd,q.fill=td,q.filter=Yd,q.flatten=vd,q.flattenDeep=wd,q.flow=xh,q.flowRight=yh,q.forEach=gh,q.forEachRight=hh,q.forIn=Kh,q.forInRight=Lh,q.forOwn=Mh,q.forOwnRight=Nh,q.functions=Xe,q.groupBy=ih,q.indexBy=jh,q.initial=yd,q.intersection=Vg,q.invert=$e,q.invoke=kh,q.keys=Oh,q.keysIn=_e,q.map=_d,q.mapKeys=Ph,q.mapValues=Qh,q.matches=Cf,q.matchesProperty=Df,q.memoize=ne,q.merge=Eh,q.method=$h,q.methodOf=_h,q.mixin=Ef,q.modArgs=zh,q.negate=oe,q.omit=Rh,q.once=pe,q.pairs=af,q.partial=Ah,q.partialRight=Bh,q.partition=lh,q.pick=Sh,q.pluck=ae,q.property=Hf,q.propertyOf=If,q.pull=Bd,q.pullAt=Wg,q.range=Jf,q.rearg=Ch,q.reject=be,q.remove=Cd,q.rest=Dd,q.restParam=qe,q.set=cf,q.shuffle=de,q.slice=Ed,q.sortBy=ge,q.sortByAll=oh,q.sortByOrder=he,q.spread=re,q.take=Fd,q.takeRight=Gd,q.takeRightWhile=Hd,q.takeWhile=Id,q.tap=Pd,q.throttle=se,q.thru=Qd,q.times=Kf,q.toArray=Ue,q.toPlainObject=Ve,q.transform=df,q.union=Zg,q.uniq=Jd,q.unzip=Kd,q.unzipWith=Ld,q.values=ef,q.valuesIn=ff,q.where=ie,q.without=$g,q.wrap=te,q.xor=Md,q.zip=_g,q.zipObject=Nd,q.zipWith=ah,q.backflow=yh,q.collect=_d,q.compose=yh,q.each=gh,q.eachRight=hh,q.extend=Fh,q.iteratee=zf,q.methods=Xe,q.object=Nd,q.select=Yd,q.tail=Dd,q.unique=Jd,Ef(q,q),q.add=Mf,q.attempt=Zh,q.camelCase=Th,q.capitalize=jf,q.ceil=ai,q.clone=ue,q.cloneDeep=ve,q.deburr=kf,q.endsWith=lf,q.escape=mf,q.escapeRegExp=nf,q.every=Xd,q.find=eh,q.findIndex=Tg,q.findKey=Ih,q.findLast=fh,q.findLastIndex=Ug,q.findLastKey=Jh,q.findWhere=Zd,q.first=ud,q.floor=bi,q.get=Ye,q.gt=we,q.gte=xe,q.has=Ze,q.identity=Bf,q.includes=$d,q.indexOf=xd,q.inRange=gf,q.isArguments=ye,q.isArray=Dh,q.isBoolean=ze,q.isDate=Ae,q.isElement=Be,q.isEmpty=Ce,q.isEqual=De,q.isError=Ee,q.isFinite=Fe,q.isFunction=Ge,q.isMatch=Ie,q.isNaN=Je,q.isNative=Ke,q.isNull=Le,q.isNumber=Me,q.isObject=He,q.isPlainObject=Ne,q.isRegExp=Oe,q.isString=Pe,q.isTypedArray=Qe,q.isUndefined=Re,q.kebabCase=Uh,q.last=zd,q.lastIndexOf=Ad,q.lt=Se,q.lte=Te,q.max=ci,q.min=di,q.noConflict=Ff,q.noop=Gf,q.now=ph,q.pad=of,q.padLeft=Vh,q.padRight=Wh,q.parseInt=pf,q.random=hf,q.reduce=mh,q.reduceRight=nh,q.repeat=qf,q.result=bf,q.round=ei,q.runInContext=w,q.size=ee,q.snakeCase=Xh,q.some=fe,q.sortedIndex=Xg,q.sortedLastIndex=Yg,q.startCase=Yh,q.startsWith=rf,q.sum=Nf,q.template=sf,q.trim=tf,q.trimLeft=uf,q.trimRight=vf,q.trunc=wf,q.unescape=xf,q.uniqueId=Lf,q.words=yf,q.all=Xd,q.any=fe,q.contains=$d,q.eq=De,q.detect=eh,q.foldl=mh,q.foldr=nh,q.head=ud,q.include=$d,q.inject=mh,Ef(q,function(){var a={};return Fb(q,function(b,c){q.prototype[c]||(a[c]=b)}),a}(),!1),q.sample=ce,q.prototype.sample=function(a){return this.__chain__||null!=a?this.thru(function(b){return ce(b,a)}):ce(this.value())},q.VERSION=y,db(["bind","bindKey","curry","curryRight","partial","partialRight"],function(a){q[a].placeholder=q}),db(["drop","take"],function(a,b){ba.prototype[a]=function(c){var d=this.__filtered__;if(d&&!b)return new ba(this);c=null==c?1:vg(rg(c)||0,0);var e=this.clone();return d?e.__takeCount__=wg(e.__takeCount__,c):e.__views__.push({size:c,type:a+(e.__dir__<0?"Right":"")}),e},ba.prototype[a+"Right"]=function(b){return this.reverse()[a](b).reverse()}}),db(["filter","map","takeWhile"],function(a,b){var c=b+1,d=c!=O;ba.prototype[a]=function(a,b){var e=this.clone();return e.__iteratees__.push({iteratee:Oc(a,b,1),type:c}),e.__filtered__=e.__filtered__||d,e}}),db(["first","last"],function(a,b){var c="take"+(b?"Right":"");ba.prototype[a]=function(){return this[c](1).value()[0]}}),db(["initial","rest"],function(a,b){var c="drop"+(b?"":"Right");ba.prototype[a]=function(){return this.__filtered__?new ba(this):this[c](1)}}),db(["pluck","where"],function(a,b){var c=b?"filter":"map",d=b?Nb:Hf;ba.prototype[a]=function(a){return this[c](d(a))}}),ba.prototype.compact=function(){return this.filter(Bf)},ba.prototype.reject=function(a,b){return a=Oc(a,b,1),this.filter(function(b){return!a(b)})},ba.prototype.slice=function(a,b){a=null==a?0:+a||0;var c=this;return c.__filtered__&&(a>0||0>b)?new ba(c):(0>a?c=c.takeRight(-a):a&&(c=c.drop(a)),b!==x&&(b=+b||0,c=0>b?c.dropRight(-b):c.take(b-a)),c)},ba.prototype.takeRightWhile=function(a,b){return this.reverse().takeWhile(a,b).reverse()},ba.prototype.toArray=function(){return this.take(Bg)},Fb(ba.prototype,function(a,b){var c=/^(?:filter|map|reject)|While$/.test(b),d=/^(?:first|last)$/.test(b),e=q[d?"take"+("last"==b?"Right":""):b];e&&(q.prototype[b]=function(){var b=d?[1]:arguments,f=this.__chain__,g=this.__wrapped__,h=!!this.__actions__.length,i=g instanceof ba,j=b[0],k=i||Dh(g);k&&c&&"function"==typeof j&&1!=j.length&&(i=k=!1);var l=function(a){return d&&f?e(a,1)[0]:e.apply(x,jb([a],b))},m={func:Qd,args:[l],thisArg:x},n=i&&!h;if(d&&!f)return n?(g=g.clone(),g.__actions__.push(m),a.call(g)):e.call(x,this.value())[0];if(!d&&k){g=n?g:new ba(this);var o=a.apply(g,b);return o.__actions__.push(m),new _(o,f)}return this.thru(l)})}),db(["join","pop","push","replace","shift","sort","splice","split","unshift"],function(a){var b=(/^(?:replace|split)$/.test(a)?$f:Yf)[a],c=/^(?:push|sort|unshift)$/.test(a)?"tap":"thru",d=/^(?:join|pop|replace|shift)$/.test(a);q.prototype[a]=function(){var a=arguments;return d&&!this.__chain__?b.apply(this.value(),a):this[c](function(c){return b.apply(c,a)})}}),Fb(ba.prototype,function(a,b){var c=q[b];if(c){var d=c.name+"",e=Hg[d]||(Hg[d]=[]);e.push({name:b,func:c})}}),Hg[Fc(x,A).name]=[{name:"wrapper",func:x}],ba.prototype.clone=Qa,ba.prototype.reverse=Ra,ba.prototype.value=Sa,q.prototype.chain=Rd,q.prototype.commit=Sd,q.prototype.concat=bh,q.prototype.plant=Td,q.prototype.reverse=Ud,q.prototype.toString=Vd,q.prototype.run=q.prototype.toJSON=q.prototype.valueOf=q.prototype.value=Wd,q.prototype.collect=q.prototype.map,q.prototype.head=q.prototype.first,q.prototype.select=q.prototype.filter,q.prototype.tail=q.prototype.rest,q}var x,y="3.10.1",z=1,A=2,B=4,C=8,D=16,E=32,F=64,G=128,H=256,I=30,J="...",K=150,L=16,M=200,N=1,O=2,P="Expected a function",Q="__lodash_placeholder__",R="[object Arguments]",S="[object Array]",T="[object Boolean]",U="[object Date]",V="[object Error]",W="[object Function]",X="[object Map]",Y="[object Number]",Z="[object Object]",$="[object RegExp]",_="[object Set]",aa="[object String]",ba="[object WeakMap]",ca="[object ArrayBuffer]",da="[object Float32Array]",ea="[object Float64Array]",fa="[object Int8Array]",ga="[object Int16Array]",ha="[object Int32Array]",ia="[object Uint8Array]",ja="[object Uint8ClampedArray]",ka="[object Uint16Array]",la="[object Uint32Array]",ma=/\b__p \+= '';/g,na=/\b(__p \+=) '' \+/g,oa=/(__e\(.*?\)|\b__t\)) \+\n'';/g,pa=/&(?:amp|lt|gt|quot|#39|#96);/g,qa=/[&<>"'`]/g,ra=RegExp(pa.source),sa=RegExp(qa.source),ta=/<%-([\s\S]+?)%>/g,ua=/<%([\s\S]+?)%>/g,va=/<%=([\s\S]+?)%>/g,wa=/\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\n\\]|\\.)*?\1)\]/,xa=/^\w*$/,ya=/[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\n\\]|\\.)*?)\2)\]/g,za=/^[:!,]|[\\^$.*+?()[\]{}|\/]|(^[0-9a-fA-Fnrtuvx])|([\n\r\u2028\u2029])/g,Aa=RegExp(za.source),Ba=/[\u0300-\u036f\ufe20-\ufe23]/g,Ca=/\\(\\)?/g,Da=/\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g,Ea=/\w*$/,Fa=/^0[xX]/,Ga=/^\[object .+?Constructor\]$/,Ha=/^\d+$/,Ia=/[\xc0-\xd6\xd8-\xde\xdf-\xf6\xf8-\xff]/g,Ja=/($^)/,Ka=/['\n\r\u2028\u2029\\]/g,La=function(){var a="[A-Z\\xc0-\\xd6\\xd8-\\xde]",b="[a-z\\xdf-\\xf6\\xf8-\\xff]+";return RegExp(a+"+(?="+a+b+")|"+a+"?"+b+"|"+a+"+|[0-9]+","g")}(),Ma=["Array","ArrayBuffer","Date","Error","Float32Array","Float64Array","Function","Int8Array","Int16Array","Int32Array","Math","Number","Object","RegExp","Set","String","_","clearTimeout","isFinite","parseFloat","parseInt","setTimeout","TypeError","Uint8Array","Uint8ClampedArray","Uint16Array","Uint32Array","WeakMap"],Na=-1,Oa={};Oa[da]=Oa[ea]=Oa[fa]=Oa[ga]=Oa[ha]=Oa[ia]=Oa[ja]=Oa[ka]=Oa[la]=!0,Oa[R]=Oa[S]=Oa[ca]=Oa[T]=Oa[U]=Oa[V]=Oa[W]=Oa[X]=Oa[Y]=Oa[Z]=Oa[$]=Oa[_]=Oa[aa]=Oa[ba]=!1;var Pa={};Pa[R]=Pa[S]=Pa[ca]=Pa[T]=Pa[U]=Pa[da]=Pa[ea]=Pa[fa]=Pa[ga]=Pa[ha]=Pa[Y]=Pa[Z]=Pa[$]=Pa[aa]=Pa[ia]=Pa[ja]=Pa[ka]=Pa[la]=!0,Pa[V]=Pa[W]=Pa[X]=Pa[_]=Pa[ba]=!1;var Qa={"À":"A","Á":"A","Â":"A","Ã":"A","Ä":"A","Å":"A","à":"a","á":"a","â":"a","ã":"a","ä":"a","å":"a","Ç":"C","ç":"c","Ð":"D","ð":"d","È":"E","É":"E","Ê":"E","Ë":"E","è":"e","é":"e","ê":"e","ë":"e","Ì":"I","Í":"I","Î":"I","Ï":"I","ì":"i","í":"i","î":"i","ï":"i","Ñ":"N","ñ":"n","Ò":"O","Ó":"O","Ô":"O","Õ":"O","Ö":"O","Ø":"O","ò":"o","ó":"o","ô":"o","õ":"o","ö":"o","ø":"o","Ù":"U","Ú":"U","Û":"U","Ü":"U","ù":"u","ú":"u","û":"u","ü":"u","Ý":"Y","ý":"y","ÿ":"y","Æ":"Ae","æ":"ae","Þ":"Th","þ":"th","ß":"ss"},Ra={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","`":"&#96;"},Sa={"&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&#39;":"'","&#96;":"`"},Ta={"function":!0,object:!0},Ua={0:"x30",1:"x31",2:"x32",3:"x33",4:"x34",5:"x35",6:"x36",7:"x37",8:"x38",9:"x39",A:"x41",B:"x42",C:"x43",D:"x44",E:"x45",F:"x46",a:"x61",b:"x62",c:"x63",d:"x64",e:"x65",f:"x66",n:"x6e",r:"x72",t:"x74",u:"x75",v:"x76",x:"x78"},Va={"\\":"\\","'":"'","\n":"n","\r":"r","\u2028":"u2028","\u2029":"u2029"},Wa=Ta[typeof exports]&&exports&&!exports.nodeType&&exports,Xa=Ta[typeof module]&&module&&!module.nodeType&&module,Ya=Wa&&Xa&&"object"==typeof global&&global&&global.Object&&global,Za=Ta[typeof self]&&self&&self.Object&&self,$a=Ta[typeof window]&&window&&window.Object&&window,_a=Xa&&Xa.exports===Wa&&Wa,ab=Ya||$a!==(this&&this.window)&&$a||Za||this,bb=w();"function"==typeof define&&"object"==typeof define.amd&&define.amd?define(function(){return bb}):Wa&&Xa&&(_a?(Xa.exports=bb)._=bb:Wa._=bb),a.constant("lodash",bb)}]);