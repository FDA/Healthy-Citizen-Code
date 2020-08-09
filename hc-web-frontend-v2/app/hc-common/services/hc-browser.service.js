;(function () {
  angular
    .module('app.hcCommon')
    .factory('HcBrowserService', HcBrowserService);

  function HcBrowserService() {
    return {
      isMediaTypeSupported: isMediaTypeSupported,
      isOpera: isOpera,
      isFirefox: isFirefox,
      isSafari: isSafari,
      isIE: isIE,
      isEdge: isEdge,
      isBlink: isBlink,
      isChrome: isChrome
    };

    function isMediaTypeSupported(mimeType) {
      return MediaRecorder.isTypeSupported(mimeType);
    }

    // https://stackoverflow.com/a/9851769/4575370
    // Opera 8.0+
    function isOpera() {
      return (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
    }

    // Firefox 1.0+
    function isFirefox() {
      return typeof InstallTrigger !== 'undefined';
    }

  // Safari 3.0+ "[object HTMLElementConstructor]"
  function isSafari() {
    return /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && safari.pushNotification));
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
    return !!window.chrome && !!window.chrome.webstore;
  }

  // Blink engine detection
  function isBlink() {
    return (isChrome || isOpera) && !!window.CSS;
  }
  }
})();