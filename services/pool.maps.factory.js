(function() {
  'use strict';

  angular
    .module('ngMap')
    .factory('MapPool', MapPool);


  MapPool.$inject = [ '$q', 'lodash', 'GoogleMapApi', 'NgMap', '$compile'];
  function MapPool($q, lodash, GoogleMapApi, NgMap, $compile) {

    //Array of Maps instances
    var maps = [];

    var factory = {
      getMap: getMap,
      addMap: addMap,
      createDiv: createDiv
    }

    function getMap(el) {
      return $q(function(resolve, reject) {
        var map = lodash.find(maps, { id: el[0].attributes['ngmap-id'].value });
        if (!map) {
          createDiv(el)
            .then(addMap)
            .then(function (map) {
              resolve(map);
            });
        } else {
          el.append(map.map.getDiv());
          NgMap.loadMap(map);
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
        NgMap.id = mapDiv.id;
        NgMap.div = mapDiv;
        GoogleMapApi.then(function () {
          var map = new google.maps.Map(NgMap.div, {});
          NgMap.initMap(map);
          maps.push(NgMap);
          resolve(map);
        });
      });
    }


    return factory;
  }

})();
