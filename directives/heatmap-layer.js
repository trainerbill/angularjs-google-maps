(function() {
  'use strict';

  angular
  .module('ngMap')
  .directive('heatmapLayer', heatmapLayer);

  DirectiveController.inject = ['$scope', 'NgMap'];
  function DirectiveController($scope, NgMap) {
    var vm = this;

    console.log('heatmapLayerDirective::Init', vm);
    NgMap.getHeatmap(vm.ngmapHeatmapId)
      .then(function (heatmap) {
        vm.heatmap = heatmap;
      });

    //Set Events
    if (vm.ngmapEvents) {
      NgMap.ready.then(function () {
        NgMap.setEvents(vm.ngmapEvents);
      });
    }

    $scope.$watch('vm.ngmapData', function(newData, oldData) {
      if (newData !== oldData) {
        console.log('Heatmap Data Changed', newData);
        NgMap.ready.then(function () {
          //console.log(vm.heatmap);
          if (!vm.heatmap) {
            vm.heatmap = new google.maps.visualization.HeatmapLayer({ data: newData, radius: vm.radius || 25 });
            console.log('New Heatmap', vm.heatmap);
            NgMap.addHeatmap({ id: vm.ngmapHeatmapId, heatmap: vm.heatmap });
          } else {
            console.log('Existing Heatmap', vm.heatmap);
            vm.heatmap.setData(newData);
          }
        });
      }
    });

  }

  function heatmapLayer() {
    var directive = {
      restrict: 'E',
      require: ['?^ngMap'],
      scope: {
        ngmapHeatmapId: '@',
        ngmapData: '=',
        ngmapEvents: '=',

        radius: '@'
      },
      controller: DirectiveController,
      controllerAs: 'vm',
      bindToController: true
    };

    return directive;
  }

 })();
