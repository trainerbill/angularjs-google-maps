(function() {
  'use strict';

  angular
    .module('ngMap')
    .service('NgMapPool', NgMapPool);


  NgMapPool.$inject = [ '$q', 'lodash', 'GoogleMapApi', '$interval', 'NgMap'];
  function NgMapPool($q, lodash, GoogleMapApi, $interval, NgMap) {

    //Array of Maps instances
    var maps = [];

    var factory = {
      getMap: getMap,
      createMap: createMap,
      addMap: addMap,
      returnMap: returnMap,
      createDiv: createDiv,
    }

    //Creates a Map.  Resolves if one is created, rejects if one is found in the pool
    function createMap(el) {
      return $q(function(resolve, reject) {
        console.log('Map Pool', maps);
        console.log('Finding Map', el[0].attributes['ngmap-id'].value);
        var map = lodash.find(maps, { id: el[0].attributes['ngmap-id'].value });
        if (!map) {
          console.log('Creating Map', el);
          createDiv(el)
            .then(addMap)
            .then(function (map) {
              resolve(map);
            });
        } else {
          console.log('Found Map', map);
          el.append(map.map.getDiv());
          reject(map);
        }
      });
    }

    function getMap(id) {
      return $q(function(resolve, reject) {
        var map = lodash.find(maps, { id: id });
        if (!map) {
          var i = 10
          //Wait for map to load from directive
          var mapWait = $interval(function () {
            map = lodash.find(maps, { id: id });
            if (map) {
              $interval.cancel(mapWait);
              resolve(map);
            }
          }, 100, i);
          mapWait.then(function (current) {
            if (i >= current) {
              reject('Map Not Found');
            }
          })
        } else {
          resolve(map);
        }
      });
    }

    function createDiv(el) {
      return $q(function(resolve, reject) {
        var mapDiv = document.createElement("div");
        mapDiv.style.width = "100%";
        mapDiv.style.height = "100%";
        mapDiv.style.height = '700px';

        mapDiv.setAttribute('id', el[0].attributes['ngmap-id'].value);
        el.append(mapDiv);

        resolve(mapDiv);
      });
    }

    function addMap(mapDiv) {
      return $q(function(resolve, reject) {
        var map = new NgMap();
        map.id = mapDiv.id;
        map.div = mapDiv;
        GoogleMapApi.then(function () {
          var gmap = new google.maps.Map(map.div, {});
          map.map = gmap;
          maps.push(map);
          console.log('This map', maps);
          map.initMap(gmap).then(function () {
            console.log('Map Added Successfully');
            resolve(map);
          });

        });
      });
    }

    function returnMap(map) {
      console.log(map);
      //map.resetReady();
    }


    return factory;
  }

})();
