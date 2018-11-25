(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('stringArrayControl', stringArrayControl);

  function stringArrayControl(AdpValidationService) {
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

        scope.isRequired = AdpValidationService.isRequired(scope.validationParams);
        function setData(value) {
          return scope.adpFormData[scope.field.keyName] = value;
        }

        function isEmpty() {
          var data = getData();
          return _.isUndefined(data) || _.isNull(data) || _.isEmpty(data);
        }

        // return ref object for form field value
        function getData() {
          return scope.adpFormData[scope.field.keyName];
        }
      }
    }
  }
})();
