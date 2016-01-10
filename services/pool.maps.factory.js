(function() {
  'use strict';

  angular
    .module('ngMap')
    .service('NgMapPool', NgMapPool);


  NgMapPool.$inject = [ '$q', 'lodash', 'GoogleMapApi', '$interval', 'NgMap'];
  function NgMapPool($q, lodash, GoogleMapApi, $interval, NgMap) {

    //Array of Maps instances
    var maps = [];

    //ngMap instance holder
    var ngMap;

    var factory = {
      getMap: getMap,
      addMap: addMap,
      returnMap: returnMap,
      findMap: findMap
    }

    function findMap (id) {
      return $q(function(resolve, reject) {
        var map = lodash.find(maps, { id: id });
        if (!map) {
          reject();
        }
        resolve(map);
      });
    }



    function getMap(id) {
      return $q(function(resolve, reject) {
        id = id || 'ngmapDefault';
        var map = lodash.find(maps, { id: id });
        if (!map) {
          var i = 10
          //Wait for map to load from directive
          var mapWait = $interval(function () {
            console.log('Finding Map in Pool', id, maps);
            map = lodash.find(maps, { id: id });
            if (map) {
              $interval.cancel(mapWait);
              resolve(map);
            }
          }, 1000, i);
          mapWait.then(function (current) {
            console.log('Map Not Found Waiting', id, current);
            if (i >= current) {
              reject('Map Not Found');
            }
          })
        } else {
          resolve(map);
        }
      });
    }



    function addMap(ngMap) {
      return $q(function(resolve, reject) {
        maps.push(ngMap);
      });
    }

    function returnMap(map) {
      console.log(map);
      //map.resetReady();
    }


    return factory;
  }

})();
