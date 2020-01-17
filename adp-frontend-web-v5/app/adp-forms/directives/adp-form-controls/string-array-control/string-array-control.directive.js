(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('stringArrayControl', stringArrayControl);

  function stringArrayControl(AdpValidationUtils) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/string-array-control/string-array-control.html',
      require: '^^form',
      link: function (scope) {
        if (isEmpty()) {
          setData([]);
        }

        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
        function setData(value) {
          return scope.adpFormData[scope.field.fieldName] = value;
        }

        function isEmpty() {
          var data = getData();
          return _.isUndefined(data) || _.isNull(data) || _.isEmpty(data);
        }

        // return ref object for form field value
        function getData() {
          return scope.adpFormData[scope.field.fieldName];
        }
      }
    }
  }
})();
