(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('readonlyControl', readonlyControl);

  function readonlyControl($filter) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/readonly-control/readonly-control.html',
      require: '^^form',
      link: function (scope) {
        var dataRow = scope.adpFormData;
        var schema = scope.validationParams.schema;
        var name = scope.field.fieldName;

        var filterFn = $filter('adpDataPresenter');
        scope.fieldValue = filterFn(dataRow, schema, name);
      }
    }
  }
})();
