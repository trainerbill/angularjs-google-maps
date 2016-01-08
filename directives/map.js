(function() {
  'use strict';

  angular
  .module('ngMap')
  .directive('ngMap', ngMap);

  DirectiveController.$inject = [ '$element', '$attrs', 'MapPool', 'lodash', '$scope', '$compile', 'NgMap' ];
  function DirectiveController($element, $attrs, MapPool, lodash, $scope, $compile, NgMap) {
    var vm = this;

    console.log('ngMapDirective::Init', vm);

    MapPool
      .getMap($element)
      .then(function (map) {
        vm.map = map;
        mapInit(map);
      })
      .catch(function (err) {
        console.log('Failed map load');
      });

      //Watchers
      if (vm.center) {
        $scope.$watch('vm.center', function(newData, oldData) {
          if (newData !== oldData) {
            console.log('Center Changed', newData);
            NgMap.ready.then(function () {
              var center = newData;
              if (!(center instanceof google.maps.LatLng)) {
                center = new google.maps.LatLng(newData);
              }
              NgMap.map.setCenter(center);
            });
          }
        });
      }

      if (vm.zoom) {
        $scope.$watch('vm.zoom', function(newData, oldData) {
          if (newData !== oldData) {
            console.log('Zoom Changed', newData);
            NgMap.ready.then(function () {
              NgMap.map.setZoom(newData);
            });
          }
        });
      }

      function mapInit(map) {
        //Set Center
        if (vm.center) {
          var center = vm.center;
          if (!(center instanceof google.maps.LatLng)) {
            center = new google.maps.LatLng(vm.center);
          }
          map.setCenter(center);
        } else {
          map.setCenter({ lat: 38.57641981479348, lng: -95.40967999999997 });
        }

        //setZoom
        if (vm.zoom) {
          map.setZoom(vm.zoom);
        } else {
          map.setZoom(4);
        }
      }
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
