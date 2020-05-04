;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .factory('AdpFullscreenService', AdpFullscreenService);

  /** @ngInject */
  function AdpFullscreenService ($rootScope){
    var registeredElements = [];

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

      var element = registeredElements.length ? registeredElements[registeredElements.length-1] : _elem;

      forceFullscreen(element);
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
      return !!getFullscreenElement();
    }

    function getFullscreenElement(){
      return document.fullscreenElement
      || document.mozFullScreenElement
      || document.webkitFullscreenElement
      || document.msFullscreenElement;
    }

    function toggleFullScreen(element) {
      return fullscreenEnabled() ? exitFullscreen() : requestFullscreen(element);
    }

    function registerFullScreenElement(el){
      registeredElements.push(el);
    }

    function unregisterFullScreenElement(el){
      var index = registeredElements.indexOf(el);

      if (index >= 0) {
        registeredElements.splice(index, 1);
      }

      // make sure isFullscreen is false if fullscreened element was destroyed before FS mode exit
      if (!getFullscreenElement()) {
        $rootScope.isFullscreen = false;
      }
    }
  }
})();
