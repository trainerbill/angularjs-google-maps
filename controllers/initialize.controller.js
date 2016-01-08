(function() {
  'use strict';

  angular
    .module('ngMap')
    .controller('__InitializeNgMapController', __InitializeNgMapController);

  __InitializeNgMapController.$inject = [ '$element', '$attrs', 'MapPool', 'lodash', '$scope', '$compile', 'NgMap' ];
  function __InitializeNgMapController($element, $attrs, MapPool, lodash, $scope, $compile, NgMap) {
    var vm = this;

    MapPool
      .getMap($element)
      .then(function (map) {
        vm.map = map;
      })
      .catch(function (err) {
        console.log('Failed map load');
      });





  }
})();
