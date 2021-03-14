;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .service('AdpLayoutConfigService', AdpLayoutConfigService);

  /** @ngInject */
  function AdpLayoutConfigService() {
    function requestLayoutParams() {
      var INTERFACE = window.adpAppStore.appInterface();
      var layoutConfig = INTERFACE.layout;

      var layoutParams = {
        'fixed-header': layoutConfig.fixed.header,
        'fixed-navigation': layoutConfig.fixed.navigation,
        'fixed-ribbon': layoutConfig.fixed.ribbon,
        'fixed-page-footer': layoutConfig.fixed.footer,
        'smart-rtl': layoutConfig.rtlSupport,
        'colorblind-friendly': layoutConfig.colorblind,
        'background': layoutConfig.background,
        'menu-on-top': layoutConfig.menuPosition === 'top',
        'container': layoutConfig.fixedWidth
      };
      applyLayoutRules(layoutParams);

      return layoutParams;
    }

    function applyLayoutRules(layoutParams) {
      // set of rules that defines how configuration show be applied
      if (layoutParams['fixed-header'] === false) {
        layoutParams['fixed-ribbon'] = false;
        layoutParams['fixed-navigation'] = false;
      }

      if (layoutParams['fixed-navigation']) {
        layoutParams['container'] = false;
        layoutParams['fixed-header'] = true;
      } else {
        layoutParams['fixed-ribbon'] = false;
      }

      if (layoutParams['fixed-ribbon']) {
        layoutParams['fixed-header'] = true;
        layoutParams['fixed-navigation'] = true;
        layoutParams['container'] = false;
      }

      if (layoutParams['container']) {
        layoutParams['fixed-navigation'] = false;
        layoutParams['fixed-ribbon'] = false;
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

    this.layoutClass = function () {
      var layoutParams = requestLayoutParams();

      return _.filter(_.keys(layoutParams), function (fieldName) {
        return layoutParams[fieldName];
      }).join(' ');
    }
  }
})();

