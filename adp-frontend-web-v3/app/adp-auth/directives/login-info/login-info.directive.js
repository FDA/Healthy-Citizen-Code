;(function () {
  'use strict';

  angular
    .module('app.adpAuth')
    .directive('loginInfo', LoginInfoDirective);

  function LoginInfoDirective(
    AdpSessionService,
    INTERFACE
  ) {
    return {
      restrict: 'E',
      templateUrl: 'app/adp-auth/directives/login-info/login-info.template.html',
      link: function(scope) {
        scope.user = AdpSessionService.getUser();
        scope.disabled = !INTERFACE.header.components.userMenu;
      }
    }
  }
})();