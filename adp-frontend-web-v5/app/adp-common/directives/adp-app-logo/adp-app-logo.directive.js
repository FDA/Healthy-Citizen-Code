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

        scope.apiUrl = APP_CONFIG.apiUrl;
        scope.logoSrc = INTERFACE.app.logo.small === 'none' ? '' : INTERFACE.app.logo.small;
        scope.title = INTERFACE.app.title;
      }
    }
  }

})();
