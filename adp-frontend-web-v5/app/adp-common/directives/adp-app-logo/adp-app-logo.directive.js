;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .directive('adpAppLogo', adpAppLogo);

  function adpAppLogo(APP_CONFIG) {
    return {
      restrict: 'E',
      templateUrl: 'app/adp-common/directives/adp-app-logo/adp-app-logo.html',
      replace: true,
      link: function(scope) {
        var INTERFACE = window.adpAppStore.appInterface();

        scope.logoSrc = [APP_CONFIG.apiUrl, INTERFACE.app.logo.small].join('');
        scope.title = INTERFACE.app.title;
      }
    }
  }

})();