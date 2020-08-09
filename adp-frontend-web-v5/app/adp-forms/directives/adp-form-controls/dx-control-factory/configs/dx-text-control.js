;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('DxTextConfig', DxTextConfig);

  /** @ngInject */
  function DxTextConfig() {
    return function () {
      return {
        options: {
          minHeight: '80px',
          autoResizeEnabled: true,
          valueChangeEvent: 'input blur',
        },
        widgetName: 'dxTextArea',
      };
    }
  }

})();
