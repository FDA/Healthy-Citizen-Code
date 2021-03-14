;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('DxCurrencyConfig', DxCurrencyConfig);

  /** @ngInject */
  function DxCurrencyConfig(DX_ACCOUNTING_FORMAT, DxNumberHelper) {
    return function (args) {
      return {
        options: getOptions(args),
        widgetName: 'dxNumberBox',
      };
    }

    function getOptions(args) {
      var field = args.fieldSchema;
      var preventWheelCb = DxNumberHelper.preventMouseWheel();

      return {
        valueChangeEvent: 'blur keyup change',
        onValueChanged: function (e) {
          var shouldPrevent = preventWheelCb(e) !== undefined;
          if (shouldPrevent) {
            return false;
          }

          if (e.value === 0 && _.isNumber(e.previousValue)) {
            // update fired on next change event
            e.component.option('value', null);
          }
        },
        inputAttr: {
          'field-name-input': field.fieldName,
          id: field.fieldName,
        },
        showSpinButtons: true,
        format: DX_ACCOUNTING_FORMAT,
      };
    }
  }

})();
