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
        mapDiv.className = ngMap.class;
        mapDiv.setAttribute('id', ngMap.id);
        ngMap.div = mapDiv;

        //Add Map Div to element
        $element.append(mapDiv)

        var options = vm.ngmapOptions;

        if (!options) {
          options = {
            center: { lat: 37.783316, lng: -122.440023 },
            zoom: 4
          };
        }
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
