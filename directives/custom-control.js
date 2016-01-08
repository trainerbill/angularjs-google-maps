(function() {
  'use strict';

  angular
  .module('ngMap')
  .directive('customControl', customControl);

  DirectiveController.inject = ['$scope', 'NgMap', '$compile', '$element'];
  function DirectiveController($scope, NgMap, $compile, $element) {
    var vm = this;

    console.log('customToolsDirective::Init', vm);

    //TODO  Not sure what this does but probably can be done better.
    var customControlEl = $element[0].parentElement.removeChild($element[0]);
    $compile(customControlEl.innerHTML.trim())($scope);

    NgMap.ready
      .then(function (map) {
        console.log(NgMap);
        NgMap.map.controls[google.maps.ControlPosition[vm.position]].push(customControlEl);
        NgMap.customControls.push(vm.position);
      });


    $element.bind('$destroy', function() {
      //console.log('DestroyCustomControls', Map.customControls);
      NgMap.map.controls[google.maps.ControlPosition[vm.position]].clear();
      NgMap.customControls.splice(NgMap.customControls.indexOf(vm.position));
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
      require: ['?^ngMap'],
      scope: {
        position: '@'
      },
      controller: DirectiveController,
      controllerAs: 'vm',
      bindToController: true
    };

    return directive;
  }

 })();
