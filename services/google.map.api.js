(function() {
  'use strict';

  angular
    .module('ngMap')
    .service('GoogleMapApi', GoogleMapApi);


  GoogleMapApi.$inject = [ '$window', '$q' ];
  function GoogleMapApi($window, $q) {
    var deferred = $q.defer();

    // Load Google map API script
    function loadScript() {
        console.log('Loading Script');
        // Use global document since Angular's $document is weak
        var script = document.createElement('script');
        script.src = '//maps.google.com/maps/api/js?libraries=drawing,geometry,visualization&callback=ngMapCallback';
        document.body.appendChild(script);
    }

    // Script loaded callback, send resolve
    $window.ngMapCallback = function () {
      console.log('Script Loaded');
        deferred.resolve();
    }

    loadScript();

    return deferred.promise;
  }
})();
