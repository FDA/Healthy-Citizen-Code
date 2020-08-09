;(function () {
  'use strict';

  angular
    .module('app.hcAuth')
    .directive('hcLoginInfo', hcLoginInfo);

  function hcLoginInfo(HcSessionService, INTERFACE){
    return {
      restrict: 'E',
      templateUrl: 'app/hc-auth/directives/hc-login-info/hc-login-info.template.html',
      link: function(scope){
        scope.user = HcSessionService.getUser();
        scope.app = INTERFACE.app;
      }
    }
  }

})();