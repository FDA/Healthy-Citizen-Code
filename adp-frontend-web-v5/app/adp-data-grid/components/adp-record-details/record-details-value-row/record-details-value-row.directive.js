;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .directive('recordDetailsValueRow', recordDetailsValueRow);

  function recordDetailsValueRow(AdpUnifiedArgs, ACTIONS) {
    return {
      restrict: 'E',
      scope: {
        field: '<',
        schema: '<',
        record: '<',
      },
      templateUrl: 'app/adp-data-grid/components/adp-record-details/record-details-value-row/record-details-value-row.template.html',
      replace: true,
      link: function (scope) {
        scope.valueRowClass = [
          'view-details-row',
          'view-details-row-' + scope.field.fieldName,
          'view-details-row-' + _.toLower(scope.field.type),
        ];

        scope.args = AdpUnifiedArgs.getHelperParamsWithConfig({
          path: scope.field.fieldName,
          formData: scope.record,
          schema: scope.schema,
          action: ACTIONS.VIEW_DETAILS,
        });
      }
    }
  }
})();
