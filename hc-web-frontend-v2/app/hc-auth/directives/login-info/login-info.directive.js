;(function () {
  'use strict';

  angular
    .module('app.hcAuth')
    .directive('loginInfo', LoginInfoDirective);

  function LoginInfoDirective(HcSessionService){

    return {
      restrict: 'E',
      templateUrl: 'app/hc-auth/directives/login-info/login-info.template.html',
      link: function(scope) {
        scope.user = HcSessionService.getUser();
      }
    }
  }
})();