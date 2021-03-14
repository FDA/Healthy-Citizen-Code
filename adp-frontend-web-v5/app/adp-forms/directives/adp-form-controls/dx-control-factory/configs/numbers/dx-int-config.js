;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('DxIntConfig', DxIntConfig);

  /** @ngInject */
  function DxIntConfig(DxNumberHelper) {
    return function () {
      return {
        options: {
          format: '#',
          showSpinButtons: true,
          onValueChanged: DxNumberHelper.preventMouseWheel(),
        },
        widgetName: 'dxNumberBox',
      };
    }
  }
})();
