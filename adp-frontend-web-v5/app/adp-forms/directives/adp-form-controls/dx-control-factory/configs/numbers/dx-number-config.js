;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('DxNumberConfig', DxNumberConfig);

  /** @ngInject */
  function DxNumberConfig(DxNumberHelper) {
    return function () {
      return {
        options: {
          showSpinButtons: true,
          onValueChanged: DxNumberHelper.preventMouseWheel(),
        },
        widgetName: 'dxNumberBox',
      };
    }
  }

})();
