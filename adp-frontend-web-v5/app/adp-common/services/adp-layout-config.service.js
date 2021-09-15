;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .service('AdpLayoutConfigService', AdpLayoutConfigService);

  /** @ngInject */
  function AdpLayoutConfigService($rootScope) {
    function requestLayoutParams() {
      var INTERFACE = window.adpAppStore.appInterface();
      var layoutConfig = INTERFACE.layout;

      return {
        'fixed-header': true,
        'fixed-navigation': true,
        'fixed-ribbon': layoutConfig.fixed.ribbon,
        'fixed-page-footer': layoutConfig.fixed.footer,
        'header-hidden': !INTERFACE.app.header.visible,
        'smart-rtl': layoutConfig.rtlSupport,
        'colorblind-friendly': layoutConfig.colorblind,
        'background': layoutConfig.background,
        'menu-on-top': layoutConfig.menuPosition === 'top',
      };
    }

    function updateTheme(layoutParams) {
      var getRootEl = function () { return $('body'); };
      updateThemeSettings(layoutParams);
      updateMenuOnTop(layoutParams['menu-on-top']);
      setSkin();

      function setSkin() {
        var $root = getRootEl();
        var skins = appConfig.skins;
        var currentSkin = window.adpAppStore.appInterface().skin;
        $root.removeClass(_.map(skins, 'name').join(' '));
        $root.addClass(currentSkin);
      }

      function updateThemeSettings(layoutParams) {
        _.forEach(layoutParams, function (val, key) {
          if (key === 'menu-on-top') {
            return;
          }
          getRootEl().toggleClass(key, val);
        });
      }

      function updateMenuOnTop(val) {
        var $root = getRootEl();
        $rootScope.$broadcast('$smartLayoutMenuOnTop', val);
        getRootEl().toggleClass('menu-on-top', val);
        val && $root.removeClass('minified');
      }
    }

    this.get = function (name) {
      var layoutParams = requestLayoutParams();
      return name ? layoutParams[name] : layoutParams;
    };

    this.getSkin = function () {
      var INTERFACE = window.adpAppStore.appInterface();
      return INTERFACE.skin;
    };

    this.updateThemeUI = function () {
      var layoutParams = requestLayoutParams();
      updateTheme(layoutParams);
    }

    this.layoutClass = function () {
      var layoutParams = requestLayoutParams();

      return _.filter(_.keys(layoutParams), function (fieldName) {
        return layoutParams[fieldName];
      }).join(' ');
    }
  }
})();

