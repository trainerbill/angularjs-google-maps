(function() {
  'use strict';

  angular
    .module('ngMap')
    .service('NgMapPool', NgMapPool);


  NgMapPool.$inject = [ '$q', 'lodash', 'GoogleMapApi', '$interval', 'NgMap', 'NgMapOptions'];
  function NgMapPool($q, lodash, GoogleMapApi, $interval, NgMap, NgMapOptions) {

    //Array of Maps instances
    var maps = [];

    //ngMap instance holder
    var ngMap;

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
          ngMap = new NgMap(el[0].attributes['ngmap-id'].value);
          ngMap.element = el;
          createDiv(ngMap)
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

    function createDiv(ngMap) {
      return $q(function(resolve, reject) {

        var mapDiv = document.createElement("div");
        mapDiv.style.width = "100%";
        mapDiv.style.height = "100%";
        mapDiv.style.height = '700px';
        mapDiv.setAttribute('id', ngMap.id);

        ngMap.div = mapDiv;
        ngMap.element.append(mapDiv);

        resolve(ngMap);
      });
    }

    function addMap(ngMap) {
      return $q(function(resolve, reject) {
        GoogleMapApi.then(function () {
          ngMap.map = new google.maps.Map(ngMap.div, {});
          ngMap.initMap()
            .then(function () {
              maps.push(ngMap);
              resolve(ngMap);
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
