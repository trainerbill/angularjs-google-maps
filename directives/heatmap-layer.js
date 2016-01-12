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
