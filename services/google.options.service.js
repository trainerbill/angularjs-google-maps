(function() {
  'use strict';

  angular
    .module('ngMap')
    .service('NgMapOptions', NgMapOptions);


  NgMapOptions.$inject = [ '$q', 'lodash' ];
  function NgMapOptions($q, lodash) {

    var service = {
      parseAttributes: parseAttributes
    };

    function parseAttributes(el) {
      return $q(function(resolve, reject) {
        var attributes = el[0].attributes;
        console.log('MapOptions::Parse', attributes);
      });
    }

    return service;

  }

})();
