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

        scope.logoSrc = INTERFACE.app.header.components.logo ? INTERFACE.app.logo.small : '';
        scope.logoUrl = APP_CONFIG.resourceUrl + scope.logoSrc;

        scope.title = INTERFACE.app.title;
      }
    }
  }

})();
