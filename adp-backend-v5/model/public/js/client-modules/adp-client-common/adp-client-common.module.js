(function () {
  angular.module('app.adpClientCommon', []).factory('AdpClientCommonHelper', AdpClientCommonFactory);

  /** @ngInject */
  function AdpClientCommonFactory(AdpIconsHelper) {
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

    function getMenuItemTemplate(options) {
      return function (item, num, $elem) {
        if (options.icon) {
          var iconHtml = AdpIconsHelper.getIconHtml(options.icon, { className: 'dx-icon' });
          $elem.append(iconHtml);
        }

        if (options.title) {
          var $title = $('<span>').text(options.title);
          $elem.append($title);
        }

        if (options.description) {
          $elem.attr('title', options.description);
        }

        if (options.className) {
          $elem.addClass(options.className);
        }

        return $elem;
      };
    }

    function highlightToolbarButton(element, condition){
      element.toggleClass('adp-toolbar-highlighted',!!condition);
    }

    return {
      loadScript: loadScript,
      loadCss: loadCss,
      getMenuItemTemplate: getMenuItemTemplate,
      highlightToolbarButton:highlightToolbarButton,
    };
  }
})();
