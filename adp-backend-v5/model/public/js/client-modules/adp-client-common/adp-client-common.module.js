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

    function highlightToolbarButton(component, condition){
      var SELECTED_TOOLBAR_MENU = 'adp-toolbar-highlighted';

      if (!condition) {
        component.resetOption('cssClass');
      } else {
        var css = component.option('cssClass');
        css = css.replace(SELECTED_TOOLBAR_MENU, '') + ' ' + SELECTED_TOOLBAR_MENU;
        component.option('cssClass', css);
      }

      component.element().toggleClass(SELECTED_TOOLBAR_MENU, !!condition);
    }

    function repaintToolbar(gridComponent){
      gridComponent._views.headerPanel._toolbar.repaint();
    }

    return {
      loadScript: loadScript,
      loadCss: loadCss,
      getMenuItemTemplate: getMenuItemTemplate,
      highlightToolbarButton:highlightToolbarButton,
      repaintToolbar:repaintToolbar,
    };
  }
})();
