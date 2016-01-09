(function() {
  'use strict';

  angular
  .module('ngMap')
  .directive('ngMap', ngMap);

  DirectiveController.$inject = [ '$element', '$attrs', 'NgMapPool', 'lodash', '$scope', '$q'];
  function DirectiveController($element, $attrs, NgMapPool, lodash, $scope, $q) {
    var vm = this;

    //This Promise tells the child directives that the map is loaded and they can do their thing
    var mapReady = $q.defer();
    vm.mapReady = mapReady.promise;

    //This Promise tells the child directives that the map is rendered and they can do their thing.  Used in custom controls
    var mapRendered = $q.defer();
    vm.mapRendered = mapRendered.promise;

    console.log('ngMapDirective::Init', vm);

    NgMapPool
      .createMap($element)
      //New Map Created
      .then(function (ngMap) {
        console.log('MapReturn', ngMap);
        ngMap.ready
          .then(function () {
            mapInit(ngMap);
            mapReady.resolve(ngMap);
          });
        //Tell everyone the map has rendered
        ngMap.rendered
          .then(function () {
            mapRendered.resolve(ngMap);
          })
      })
      //Map found in pool
      .catch(function (ngMap) {
        console.log('MapReturn', ngMap);
        ngMap.ready
          .then(function () {
            mapReady.resolve(ngMap);
          });
        //Tell everyone the map has rendered
        ngMap.rendered
          .then(function () {
            mapRendered.resolve(ngMap);
          })
      });

      //Watchers
      if (vm.center) {
        $scope.$watch('vm.center', function(newData, oldData) {
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

      if (vm.zoom) {
        $scope.$watch('vm.zoom', function(newData, oldData) {
          if (newData !== oldData) {
            console.log('Zoom Changed', newData);
            vm.mapReady.then(function (ngMap) {
              ngMap.map.setZoom(newData);
            });
          }
        });
      }

      function mapInit(ngMap) {
        console.log('mapInit', ngMap, vm);
        //Set Center
        if (vm.center) {
          var center = vm.center;
          if (!(center instanceof google.maps.LatLng)) {
            center = new google.maps.LatLng(vm.center);
          }
          ngMap.map.setCenter(center);
        } else {
          ngMap.map.setCenter({ lat: 38.57641981479348, lng: -95.40967999999997 });
        }

        //setZoom
        if (vm.zoom) {
          ngMap.map.setZoom(vm.zoom);
        } else {
          ngMap.map.setZoom(4);
        }
      }

      $element.bind('$destroy', function() {
        console.log('Return Map', vm.map);
        //MapPool.returnMap(vm.map);
      });
  }

  function ngMap() {
    var directive = {
      restrict: 'AE',
      scope: {
        ngmapId: '@',
        center: '=',
        zoom: '='
      },
      controller: DirectiveController,
      controllerAs: 'vm',
      bindToController: true
    };

    return directive;
  }



 })();
