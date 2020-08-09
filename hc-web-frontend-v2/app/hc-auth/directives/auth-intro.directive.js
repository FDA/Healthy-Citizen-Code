;(function () {
  'use strict';

  angular
    .module('app.hcAuth')
    .directive('authIntro', authIntro);

  function authIntro(INTERFACE, $compile) {
    return {
      restrict: 'E',
      link: function(scope, element) {
        var template = INTERFACE.loginPage.intro.template;
        scope.interface = INTERFACE;

        element.append($compile(template)(scope));
      }
    }
  }

})();