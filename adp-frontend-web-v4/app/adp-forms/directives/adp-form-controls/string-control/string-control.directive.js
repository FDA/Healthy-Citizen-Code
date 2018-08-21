(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('stringControl', stringControl);

  function stringControl() {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/string-control/string-control.html',
      require: '^^form',
      link: function (scope) {
        if (!getData()) {
          setData('')
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
