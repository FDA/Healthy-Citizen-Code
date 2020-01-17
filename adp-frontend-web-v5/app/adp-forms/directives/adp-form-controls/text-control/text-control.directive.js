(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('textControl', textControl);

  function textControl(AdpValidationUtils) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/text-control/text-control.html',
      require: '^^form',
      link: function (scope) {
        if (!getData()) {
          setData('')
        }

        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);

        function setData(value) {
          return scope.adpFormData[scope.field.fieldName] = value;
        }

        function getData() {
          return scope.adpFormData[scope.field.fieldName];
        }
      }
    }
  }
})();
