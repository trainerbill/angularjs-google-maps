(function() {
  'use strict';

  angular
  .module('ngMap')
  .directive('drawingManager', drawingManager);

  DirectiveController.inject = ['$q', '$scope', 'lodash'];
  function DirectiveController($q, $scope, lodash) {
    var vm = this;

    //Wait for NgMapDirective to resolve the map
    vm.parentPromise = $q.defer();
    vm.mapReady = vm.parentPromise.promise;


    console.log('drawingManagerDirective::Init', vm);

    vm.mapReady.then(function (ngMap) {
      vm.drawingManager = new google.maps.drawing.DrawingManager();
      var options = angular.copy(vm.drawingManagerOptions);
      console.log('DrawingManagerOptions::Init::Options', options);
      options.drawingControlOptions.drawingModes = drawingModesParse(options.drawingControlOptions.drawingModes);
      options.drawingControlOptions.position = positionParse(options.drawingControlOptions.position);




      vm.drawingManager.setOptions(options);
      vm.drawingManager.setMap(ngMap.map);
    });


    //Set Events
    if (vm.drawingManagerEvents) {
      vm.mapReady.then(function (map) {
        map.setEvents(vm.vm.drawingManagerEvents);
      });
    }


    if (vm.drawingManagerOptions) {
      $scope.$watch('vm.drawingManagerOptions', function(newData, oldData) {
        if (newData !== oldData) {
          console.log('DrawingManagerOptions::Watch::Options', newData);
          var watchOptions = angular.copy(newData);
          console.log('DrawingManagerOptions::Watch::Options', watchOptions);
          watchOptions.drawingControlOptions.drawingModes = drawingModesParse(watchOptions.drawingControlOptions.drawingModes);
          watchOptions.drawingControlOptions.position = positionParse(watchOptions.drawingControlOptions.position);
          vm.drawingManager.setOptions(watchOptions);
          /*
          console.log('DrawingManagerOptions::Watch::Options', newData.drawingControlOptions);
          var watchOptions = newData;
          //Change given options to the google equivalent
          watchOptions.drawingControlOptions.drawingModes = drawingModesParse(newData.drawingControlOptions.drawingModes);
          //Change position to the google equivalent
          watchOptions.drawingControlOptions.position = positionParse(newData.drawingControlOptions.position);
          vm.drawingManager.setOptions(watchOptions);
          */
        }
      }, true);
    }




    function drawingModesParse(modes) {
      console.log('Modes::', modes);
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
