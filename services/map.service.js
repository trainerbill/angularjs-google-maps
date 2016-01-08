(function() {
  'use strict';

  angular
    .module('ngMap')
    .service('NgMap', NgMap);


  NgMap.$inject = [ '$q', 'lodash' ];
  function NgMap($q, lodash) {

    var readyPromise = $q.defer();
    var service = {
      id: null,
      div: null,
      map: null,
      heatmaps: [],
      data: [],
      events: [],
      customControls: [],
      ready: readyPromise.promise,
      initMap: initMap,
      loadMap: loadMap,
      addHeatmap: addHeatmap,
      getHeatmap: getHeatmap,
      setEvents: setEvents,
      getEvent: getEvent
    };

    function initMap(map) {
      return $q(function(resolve, reject) {
        google.maps.event.addListenerOnce(map, 'idle', function() {
          service.map = map;
          readyPromise.resolve(service.map);
          resolve(service);
        });
      });
    }

    //Load an existing map.  We already know its ready
    function loadMap(map) {
      return $q(function(resolve, reject) {
        service.map = map.map;
        service.id = map.id;
        service.div = map.div;
        resolve(service);
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

    function setEvents(events) {
      return $q(function(resolve, reject) {
        var listener;
        console.log('Setting Events', service.events);
        events.forEach(function (evnt) {
          getEvent(evnt.type)
            .then(function (serviceEvent) {
              console.log('Event Found', serviceEvent);
              google.maps.event.removeListener(serviceEvent.listener);
              listener = google.maps.event.addListener(service.map, evnt.type, evnt.func);
              serviceEvent.listener = listener;
            })
            .catch(function () {
              listener = google.maps.event.addListener(service.map, evnt.type, evnt.func);
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
  }

})();
