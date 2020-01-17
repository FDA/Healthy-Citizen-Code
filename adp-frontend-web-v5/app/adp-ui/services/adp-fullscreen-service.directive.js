;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .factory('AdpFullscreenService', AdpFullscreenService);

  /** @ngInject */
  function AdpFullscreenService (){
    return {
      requestFullscreen: requestFullscreen,
      exitFullscreen: exitFullscreen,
      fullscreenEnabled: fullscreenEnabled
    };

    function requestFullscreen( element ) {
      if( fullscreenEnabled() ) {
        return;
      }
      if( element.requestFullscreen ) {
        element.requestFullscreen();
      } else if( element.mozRequestFullScreen ) {
        element.mozRequestFullScreen();
      } else if(element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if(element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
    }

    function exitFullscreen() {
      if (!fullscreenEnabled()) {
        return;
      }

      if(document.exitFullscreen) {
        document.exitFullscreen();
      } else if(document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if(document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }

    function fullscreenEnabled() {
      return !!(document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement);
    }
  }
})();
