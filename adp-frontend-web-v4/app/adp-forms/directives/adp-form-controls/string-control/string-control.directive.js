(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('stringControl', stringControl);

  function stringControl(AdpValidationService) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/string-control/string-control.html',
      require: '^^form',
      link: function (scope) {
        if (!getData()) {
          setData(null)
        }

        function setData(value) {
          return scope.adpFormData[scope.field.keyName] = value;
        }

        function getData() {
          return scope.adpFormData[scope.field.keyName];
        }

        scope.isRequired = AdpValidationService.isRequired(scope.validationParams);
      }
    }
  }
})();
