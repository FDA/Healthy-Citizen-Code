(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('numberControl', numberControl);

  function numberControl(AdpValidationUtils) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/number-control/number-control.html',
      require: '^^form',
      link: function (scope) {
        var isEmpty = _.isNil(getData());
        if (isEmpty) {
          setData(null);
        }

        function setData(value) {
          return scope.adpFormData[scope.field.fieldName] = value;
        }

        function getData() {
          return scope.adpFormData[scope.field.fieldName];
        }

        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
      }
    }
  }
})();
