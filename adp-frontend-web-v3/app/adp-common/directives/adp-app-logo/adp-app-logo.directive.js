;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .directive('adpAppLogo', adpAppLogo);

  function adpAppLogo(INTERFACE, CONSTANTS) {
    return {
      restrict: 'E',
      templateUrl: 'app/adp-common/directives/adp-app-logo/adp-app-logo.html',
      replace: true,
      link: function(scope) {
        scope.logoSrc = [CONSTANTS.apiUrl, INTERFACE.app.logo.small].join('');
        scope.title = INTERFACE.app.title;
      }
    }
  }

})();