;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .directive('recordDetailsGrouping', recordDetailsGrouping);

  function recordDetailsGrouping() {
    return {
      restrict: 'E',
      scope: {
        groups: '<',
        schema: '<',
        record: '<',
      },
      templateUrl: 'app/adp-data-grid/components/adp-record-details/groups/record-details-grouping/record-details-grouping.template.html',
      replace: true,
      link: function (scope) {
        var removeWatcher = scope.$watch('groups', function (val) {
          if (_.isNil(val)) {
            return;
          }

          scope.accordionOptions = {
            collapsible: true,
            multiple: true,
            items: scope.groups,
            itemTemplate: 'group',
          }
          removeWatcher();
        });

        scope.selectColumnClass = function (field) {
          var fieldWidth = field.formWidth || 12;
          return ['adp-col', 'adp-col-' + fieldWidth];
        }

        scope.showValue = function (field) {
          return field.type === 'Blank' || !_.isUndefined(scope.record[field.fieldName]);
        }
      }
    }
  }
})();
