;(function () {
  'use strict';

  angular
    .module('app.adpAuth')
    .directive('loginInfo', LoginInfoDirective);

  function LoginInfoDirective(AdpSessionService) {
    return {
      restrict: 'E',
      templateUrl: 'app/adp-auth/directives/login-info/login-info.template.html',
      link: function(scope) {
        var INTERFACE = window.adpAppStore.appInterface();
        scope.user = AdpSessionService.getUser();
        scope.disabled = !INTERFACE.header.components.userMenu;
      }
    }
  }
})();