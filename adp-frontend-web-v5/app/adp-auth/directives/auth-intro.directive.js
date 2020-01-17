;(function () {
  'use strict';

  angular
    .module('app.adpAuth')
    .directive('authIntro', authIntro);

  function authIntro(
    APP_CONFIG,
    $compile
  ) {
    return {
      restrict: 'E',
      link: function(scope, element) {
        var INTERFACE = window.adpAppStore.appInterface();
        var template = INTERFACE.loginPage.intro.template;
        scope.interface = INTERFACE;
        scope.APP_CONFIG = APP_CONFIG;

        var node = $compile(template)(scope);

        element.append(node);
      }
    }
  }

})();