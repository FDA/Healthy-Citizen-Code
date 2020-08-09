;(function () {
  'use strict';

  angular
    .module('app.hcAuth')
    .directive('hcAppLogo', hcAppLogo);

  function hcAppLogo(INTERFACE, CONSTANTS) {
    return {
      restrict: 'E',
      templateUrl: 'app/hc-common/directives/hc-app-logo/hc-app-logo.html',
      replace: true,
      link: function(scope) {
        scope.logoSrc = [CONSTANTS.apiUrl, INTERFACE.app.logo.small].join('');
        scope.title = INTERFACE.app.title;
      }
    }
  }

})();