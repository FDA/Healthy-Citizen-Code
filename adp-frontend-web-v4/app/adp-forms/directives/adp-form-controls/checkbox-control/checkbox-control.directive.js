;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('checkboxControl', checkboxControl);

  function checkboxControl() {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/checkbox-control/checkbox-control.html',
      require: '^^form',
      link: function (scope) {
        if (isEmpty()) {
          setData(false)
        }

        function isEmpty() {
          var data = getData();
          return _.isUndefined(data) || _.isNull(data);
        }

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
