(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('intNumberControl', intNumberControl);

  function intNumberControl(AdpValidationUtils) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/int-number-control/int-number-control.html',
      require: '^^form',
      link: function (scope) {
        scope.INT_REGEX = /^[+-]?\d+$/;
        if (_.isNil(scope.adpFormData[scope.field.fieldName])) {
          scope.adpFormData[scope.field.fieldName] = null;
        }

        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);

        scope.onKeyPress = function (e) {
          var isInt = /[+\-]|\d+/.test(e.key);
          if (!isInt) {
            e.preventDefault();
          }
        }
      }
    }
  }
})();
