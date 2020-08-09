;(function() {
  'use strict';

  angular
    .module('SmartAdmin.Layout')
    .directive('toggleMenu', toggleMenu);

  /** @ngInject */
  function toggleMenu(AdpUiActionsService) {
    return {
      restrict: 'A',
      link: function(scope, element){
        element.on('click', AdpUiActionsService.toggleMenu);
      }
    }
  }
})();