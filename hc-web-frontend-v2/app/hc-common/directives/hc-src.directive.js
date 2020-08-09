;(function () {
  'use strict';

  angular
    .module('app.hcAuth')
    .directive('hcSrc', hcSrc);

  // directive to fetch image from server
  function hcSrc(CONSTANTS) {
    return {
      restrict: 'A',
      templateUrl: 'app/hc-common/directives/hc-app-logo/hc-app-logo.html',
      replace: true,
      link: function(scope, element, attrs) {
        var src = [CONSTANTS.apiUrl, attrs.hcSrc].join('');
        element.attr('src', src);
      }
    }
  }

})();