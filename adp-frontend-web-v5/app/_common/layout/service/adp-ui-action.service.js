;(function () {
  'use strict';

  angular
    .module('SmartAdmin.Layout')
    .factory('AdpUiActionsService', AdpUiActionsService);

  /** @ngInject */
  function AdpUiActionsService() {
    return {
      toggleMenu: toggleMenu
    };

    function toggleMenu(){
      var $body = $('body');

      if (!$body.hasClass('menu-on-top')){
        $('html').toggleClass('hidden-menu-mobile-lock');
        $body.toggleClass('hidden-menu');
        $body.removeClass('minified');
      }

      if ($body.hasClass('menu-on-top') && $body.hasClass('mobile-view-activated')) {
        $('html').toggleClass('hidden-menu-mobile-lock');
        $body.toggleClass('hidden-menu');
        $body.removeClass('minified');
      }
    }
  }
})();
