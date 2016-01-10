(function() {
  'use strict';

  angular
  .module('ngMap')
  .directive('drawingManager', drawingManager);

  DirectiveController.inject = ['$q', '$scope'];
  function DirectiveController($q, $scope) {
    var vm = this;

    //Wait for NgMapDirective to resolve the map
    vm.parentPromise = $q.defer();
    vm.mapReady = vm.parentPromise.promise;


    console.log('drawingManagerDirective::Init', vm);

    vm.mapReady.then(function (ngMap) {
      vm.drawingManager = new google.maps.drawing.DrawingManager();
      var options = vm.drawingManagerOptions;

      //Change given options to the google equivalent
      options.drawingControlOptions.drawingModes = drawingModesParse(options.drawingControlOptions.drawingModes);

      //Change position to the google equivalent
      options.drawingControlOptions.position = positionParse(options.drawingControlOptions.position);

      console.log('DrawingManagerOptions', options);

      vm.drawingManager.setOptions(options);
      vm.drawingManager.setMap(ngMap.map);
    });


    //Set Events
    if (vm.drawingManagerEvents) {
      vm.mapReady.then(function (map) {
        map.setEvents(vm.vm.drawingManagerEvents);
      });
    }

    $scope.$watch('vm.drawingManagerOptions', function(newData, oldData) {
      if (newData !== oldData) {
        console.log('drawingManagerOptions::Changed', newData);
        vm.mapReady.then(function (ngMap) {
          newData.drawingControlOptions.drawingModes = drawingModesParse(newData.drawingControlOptions.drawingModes);
          newData.drawingControlOptions.position = positionParse(newData.drawingControlOptions.position);
          ngMap.map.setOptions(vm.drawingManagerOptions);
        });
      }
    }, true);

    function drawingModesParse(modes) {
      var rmodes = [];
      modes.forEach(function (mode) {
        rmodes.push(google.maps.drawing.OverlayType[mode]);
      });

      return rmodes;
    }

    function positionParse(position) {
      return google.maps.ControlPosition[position];
    }

  }

  function drawingManager() {
    var directive = {
      restrict: 'E',
      require: ['^ngMap'],
      scope: {
        drawingManagerEvents: '=',
        drawingManagerOptions: '='
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


/*
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
*/
