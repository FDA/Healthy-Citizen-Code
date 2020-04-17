(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('codeControl', codeControl);

  function codeControl(AdpValidationUtils) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/code-control/code-control.html',
      require: '^^form',
      link: function (scope) {
        if (_.isNil(getData())) {
          setData('');
        }

        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
        scope.getData = getData;
        scope.editorsConfig = _.get(scope, 'field.parameters.codeEditor', {});

        function getData() {
          return scope.adpFormData[scope.field.fieldName];
        }

        function setData(value) {
          return scope.adpFormData[scope.field.fieldName] = value;
        }
      }
    }
  }
})();
