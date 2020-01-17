;(function () {
  angular
    .module('app.adpCommon')
    .factory('AdpBrowserService', AdpBrowserService);

  function AdpBrowserService() {
    return {
      isMediaTypeSupported: isMediaTypeSupported,
      isMediaRecorderSupported: isMediaRecorderSupported,
      isFullscreenSupported: isFullscreenSupported,
      isIE: isIE,
      isEdge: isEdge,
      isChrome: isChrome,
      isMobile: isMobile,
      isFirefox: isFirefox,
    };

    function isMediaTypeSupported(mimeType) {
      return isMediaRecorderSupported() && MediaRecorder.isTypeSupported(mimeType);
    }

    function isMediaRecorderSupported() {
      return 'MediaRecorder' in window;
    }

    function isFullscreenSupported() {
      return document.requestFullscreen || document.mozRequestFullScreen ||
        document.webkitRequestFullscreen || document.msRequestFullscreen;
    }

    // Internet Explorer 6-11
    function isIE() {
      return /*@cc_on!@*/false || !!document.documentMode;
    }

    // Edge 20+
    function isEdge() {
      return !isIE && !!window.StyleMedia;
    }

    // Chrome 1+
    function isChrome() {
      return Boolean(window.chrome);
    }

    function isMobile() {
      var deviceType = window.adpAppStore.appInterface().app.deviceType;

      return deviceType === 'phone' || deviceType === 'tablet';
    }

    function isFirefox() {
      var browser = navigator.userAgent.toLowerCase();
      return browser.indexOf('firefox') > -1;
    }
  }
})();
