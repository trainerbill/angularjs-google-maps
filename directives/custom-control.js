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
        ngMap.map.controls[google.maps.ControlPosition[vm.position]].getAt(0).style.display = 'initial';
        //console.log('GoogleCustomControl', ngMap.map.controls[google.maps.ControlPosition[vm.position]]);
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
