;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('checkboxControl', checkboxControl);

  function checkboxControl(AdpValidationService) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/checkbox-control/checkbox-control.html',
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
          return scope.adpFormData[scope.field.keyName] = value;
        }

        function getData() {
          return scope.adpFormData[scope.field.keyName];
        }

        scope.isRequired = AdpValidationService.isRequired(scope.validationParams.formParams);
      }
    }
  }
})();
