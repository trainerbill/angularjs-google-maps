(function() {
  'use strict';

  angular
  .module('ngMap')
  .directive('ngMap', ngMap);

  DirectiveController.$inject = [ '$element', '$attrs', 'NgMapPool', 'lodash', '$scope', '$q', 'NgMap', 'GoogleMapApi'];
  function DirectiveController($element, $attrs, NgMapPool, lodash, $scope, $q, NgMap, GoogleMapApi) {
    var vm = this;

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
        console.log('Map Options: ', ngMap.options, vm.ngmapOptions);
        var options = lodash.defaults(ngMap.options, vm.ngmapOptions);

        //Override options with center and zoom if set
        if (vm.ngmapCenter) {
          options.center = vm.ngmapCenter;
        }
        if (vm.ngmapZoom) {
          options.zoom = vm.ngmapZoom;
        }



        GoogleMapApi.then(function () {
          console.log('Creating Map ', ngMap, options);
          options.center = new google.maps.LatLng(options.center);

          ngMap.map = new google.maps.Map(ngMap.div, options);
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
            console.log('MapOptions Changed', newData);
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
