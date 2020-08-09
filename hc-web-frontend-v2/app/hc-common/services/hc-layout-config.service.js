;(function () {
  'use strict';

  angular
    .module('app.hcCommon')
    .service('HcLayoutConfigService', HcLayoutConfigService);

  /** @ngInject */
  function HcLayoutConfigService(INTERFACE) {
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

    this.get = function (name) {
      return name ? layoutParams[name] : layoutParams;
    };

    this.getSkin = function () {
      return INTERFACE.skin;
    };

    this.layoutClass = function () {
      return _.filter(_.keys(layoutParams), function (keyName) {
        return layoutParams[keyName];
      }).join(' ');
    }
  }
})();

