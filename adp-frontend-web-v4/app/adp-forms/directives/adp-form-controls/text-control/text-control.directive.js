(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('textControl', textControl);

  function textControl(AdpValidationService) {
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

        scope.isRequired = AdpValidationService.isRequired(scope.validationParams.formParams);

        function setData(value) {
          return scope.adpFormData[scope.field.keyName] = value;
        }

        function getData() {
          return scope.adpFormData[scope.field.keyName];
        }
      }
    }
  }
})();
