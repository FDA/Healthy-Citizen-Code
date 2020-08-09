;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('DxNumberConfig', DxNumberConfig);

  /** @ngInject */
  function DxNumberConfig() {
    return function () {
      return {
        options: { showSpinButtons: true },
        widgetName: 'dxNumberBox',
      };
    }
  }

})();
