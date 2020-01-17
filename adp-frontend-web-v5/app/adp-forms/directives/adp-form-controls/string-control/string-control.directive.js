(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('stringControl', stringControl);

  function stringControl(AdpValidationUtils) {
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
        if (_.isNil(getData())) {
          setData(null);
        }

        function setData(value) {
          return scope.adpFormData[scope.field.fieldName] = value;
        }

        function getData() {
          return scope.adpFormData[scope.field.fieldName];
        }

        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
        scope.fieldType = resolveSubtype();

        function resolveSubtype() {
          var types = {
            'String': 'text',
            'Phone': 'text',
            'Url': 'text',
            'Email': 'email',
            'PasswordAuth': 'password',
            'Number': 'number',
          };

          return types[scope.field.type];
        }
      }
    }
  }
})();
