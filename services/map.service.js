(function() {
  'use strict';

  angular
    .module('ngMap')
    .service('NgMap', NgMap);


  NgMap.$inject = [ '$q', 'lodash' ];
  function NgMap($q, lodash) {

    var ngMap = function (id) {
      var readyPromise = $q.defer();
      var renderedPromise = $q.defer();

      var service = {
        id: id || 'ngmapDefault',
        div: null,
        map: null,
        options: {
          center: { lat: 37.783316, lng: -122.440023 },
          zoom: 4
        },
        heatmaps: [],
        data: [],
        events: [],
        element: null,
        customControls: [],
        ready: readyPromise.promise,
        rendered: renderedPromise.promise,
        initMap: initMap,
        addHeatmap: addHeatmap,
        getHeatmap: getHeatmap,
        setEvents: setEvents,
        getEvent: getEvent,
        resetReady: resetReady
      };

      function resetReady() {
        readyPromise = $q.defer();
      }

      function initMap() {
        return $q(function(resolve, reject) {
          google.maps.event.addListenerOnce(service.map, 'idle', function() {
            console.log('Map is ready Yo!');
            readyPromise.resolve(service.map);
            resolve(service);
          });

          google.maps.event.addListenerOnce(service.map, 'tilesloaded', function() {
            console.log('Map is rendered Yo!');
            renderedPromise.resolve(service);
          });
        });
      }

      function getHeatmap(id) {
        return $q(function(resolve, reject) {
          var heatmap = lodash.find(service.heatmaps, { id: id });
          //console.log('Find HeatMap', heatmap);
          ((heatmap) ? resolve(heatmap.heatmap) : reject());
        });
      }

      function addHeatmap(heatmap) {
        return $q(function(resolve, reject) {
          getHeatmap(heatmap.id)
            .then(function (find) {
              find.setData(heatmap.heatmap.getData());
              //service.heatmaps[service.heatmaps.indexOf(find)] = heatmap;
              resolve(heatmap);
            })
            .catch(function () {
              //console.log('Adding Heatmap', heatmap, Map.map);
              service.heatmaps.push(heatmap);
              heatmap.heatmap.setMap(service.map);
              resolve(heatmap);
            });
        });
      }

      function setEvents(events, obj) {
        return $q(function(resolve, reject) {
          var listener;
          console.log('Setting Events', service.events);
          events.forEach(function (evnt) {
            getEvent(evnt.type)
              .then(function (serviceEvent) {
                var setOn = obj || service.map;
                console.log('Event Found', serviceEvent);
                google.maps.event.removeListener(serviceEvent.listener);
                listener = google.maps.event.addListener(setOn, evnt.type, evnt.func);
                serviceEvent.listener = listener;
              })
              .catch(function () {
                var setOn = obj || service.map;
                console.log('Setting Event', evnt);
                listener = google.maps.event.addListener(setOn, evnt.type, evnt.func);
                console.log('Event Set', listener);
                service.events.push({ type: evnt.type, listener: listener })
              });
          });
        });
      }

      function getEvent(type) {
        return $q(function(resolve, reject) {
          console.log('Find Event', type);
          var evnt = lodash.find(service.events, { type: type });
          console.log('Find Event', evnt);
          ((evnt) ? resolve(evnt) : reject());
        });
      }

      return service;
    };

    return ngMap;
  }

})();
