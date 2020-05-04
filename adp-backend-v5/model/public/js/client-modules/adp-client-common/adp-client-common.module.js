(function () {
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

    function getMenuItemTemplate(options) {
      var iconTypes = {
        'font-awesome': 'fa fa-',
        'font-awesome-brands': 'fab fa-',
        dx: 'dx-icon-',
      };

      return function (item, num, $elem) {
        if (options.icon) {
          var iconClass = 'dx-icon ' + (iconTypes[options.icon.type || 'font-awesome'] || '') + options.icon.link;
          var $icon = $('<i>').addClass(iconClass);
          $elem.append($icon);
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

    return {
      loadScript: loadScript,
      loadCss: loadCss,
      getMenuItemTemplate: getMenuItemTemplate,
    };
  }
})();
