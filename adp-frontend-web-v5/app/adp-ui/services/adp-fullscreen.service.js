;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .factory('AdpFullscreenService', AdpFullscreenService);

  /** @ngInject */
  function AdpFullscreenService (){
    var registeredElement = null;

    return {
      requestFullscreen: requestFullscreen,
      exitFullscreen: exitFullscreen,
      fullscreenEnabled: fullscreenEnabled,
      toggleFullScreen: toggleFullScreen,
      forceFullscreen: forceFullscreen,
      registerFullScreenElement: registerFullScreenElement,
      unregisterFullScreenElement: unregisterFullScreenElement
    };

    function requestFullscreen( _elem ) {
      if( fullscreenEnabled() ) {
        return;
      }

      forceFullscreen(registeredElement || _elem);
    }

    function forceFullscreen( element ) {
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
        document.exitFullscreen().then(function(){
          exitFullscreen();
        });
      } else if(document.mozCancelFullScreen) {
        document.mozCancelFullScreen().then(function(){
          exitFullscreen();
        });
      } else if(document.webkitExitFullscreen) {
        do {
          document.webkitExitFullscreen();
        } while(fullscreenEnabled());
      } else if(document.msExitFullscreen) {
        do {
          document.msExitFullscreen();
        } while(fullscreenEnabled());
      }
    }

    function fullscreenEnabled() {
      return !!(document.fullscreenElement
        || document.mozFullScreenElement
        || document.webkitFullscreenElement
        || document.msFullscreenElement);
    }

    function toggleFullScreen(element) {
      return fullscreenEnabled() ? exitFullscreen() : requestFullscreen(element);
    }

    function registerFullScreenElement(el){
      registeredElement = el;
    }

    function unregisterFullScreenElement(el){  // there is no need to stack many, at least by nowy...
      registeredElement = null;
    }
  }
})();
