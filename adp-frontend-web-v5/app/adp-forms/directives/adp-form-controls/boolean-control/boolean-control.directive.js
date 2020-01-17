;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('booleanControl', booleanControl);

  function booleanControl(AdpValidationUtils) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/boolean-control/boolean-control.html',
      require: '^^form',
      link: function (scope) {
        if (isEmpty()) {
          setData(null)
        }

        function isEmpty() {
          var data = getData();
          return _.isNil(data);
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
