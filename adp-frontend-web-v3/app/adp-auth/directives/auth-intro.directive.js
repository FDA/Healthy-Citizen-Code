;(function () {
  'use strict';

  angular
    .module('app.adpAuth')
    .directive('authIntro', authIntro);

  function authIntro(
    CONSTANTS,
    INTERFACE,
    $compile
  ) {
    return {
      restrict: 'E',
      link: function(scope, element) {
        var template = INTERFACE.loginPage.intro.template;
        scope.interface = INTERFACE;
        scope.CONSTANTS = CONSTANTS;

        var node = $compile(template)(scope);

        element.append(node);
      }
    }
  }

})();