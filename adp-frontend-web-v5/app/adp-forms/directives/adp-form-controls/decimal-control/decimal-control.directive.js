(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('decimalControl', decimalControl);

  function decimalControl(AdpValidationUtils) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/decimal-control/decimal-control.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.DECIMAL_REGEX = /^[+-]?(\d+)?\.?(\d+)?([Ee][+-]?(\d+))?$/;
        if (_.isNil(scope.adpFormData[scope.field.fieldName])) {
          scope.adpFormData[scope.field.fieldName] = null;
        }

        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);

        scope.onKeyPress = function (e) {
          var isDecimalChar = /(\+|-|\.|\d)/.test(e.key);
          if (!isDecimalChar) {
            e.preventDefault();
          }
        }

        scope.onPaste = function (e) {
          e.preventDefault();
          var pasteText = e.originalEvent.clipboardData.getData('text');
          scope.adpFormData[scope.field.fieldName] = pasteText.replace(/[^0-9.\-+]/g, '');
          formCtrl[scope.field.fieldName].$setDirty();
        }
      }
    }
  }
})();
