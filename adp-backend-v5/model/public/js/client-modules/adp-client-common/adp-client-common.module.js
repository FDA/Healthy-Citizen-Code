(function() {
  angular.module('app.adpClientCommon', []).factory('AdpClientCommonHelper', AdpClientCommonFactory);

  /** @ngInject */
  function AdpClientCommonFactory() {
    function loadScript(src) {
      return $.getScript(src);
    }

    function loadCss(src) {
      var linkTag = document.createElement('link');
      linkTag.setAttribute('rel', 'stylesheet');
      linkTag.setAttribute('type', 'text/css');
      linkTag.setAttribute('href', src);
      document.getElementsByTagName('head')[0].appendChild(linkTag);
    }

    return {
      loadScript: loadScript,
      loadCss: loadCss,
    };
  }
})();
