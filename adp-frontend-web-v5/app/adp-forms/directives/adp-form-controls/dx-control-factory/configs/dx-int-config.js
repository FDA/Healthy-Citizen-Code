;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('DxIntConfig', DxIntConfig);

  /** @ngInject */
  function DxIntConfig() {
    return function () {
      return {
        options: {
          format: '#',
          showSpinButtons: true,
        },
        widgetName: 'dxNumberBox',
      };
    }
  }

})();
