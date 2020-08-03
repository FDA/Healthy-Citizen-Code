(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('lookupSelectorSingle', lookupSelectorSingle);

  function lookupSelectorSingle(
    LookupDataSource,
    LookupDxConfig,
    AdpFieldsService
  ) {
    return {
      restrict: 'AE',
      scope: {
        props: '=',
      },
      replace: true,
      template: '<div dx-select-box="config"></div>',
      link: function (scope, element) {
        (function init() {
          scope.config = AdpFieldsService.configFromParameters(
            scope.props.args.fieldSchema,
            LookupDxConfig.single(scope.props)
          );

          addTableWatcher(scope.props);
        })();

        function addTableWatcher(props) {
          scope.$watch('props.selectedTableName', function (tableName) {
            var instance = element.dxSelectBox('instance');
            if (instance && tableName) {
              instance.option('dataSource', LookupDataSource(props.args, tableName));
            }
          });
        }
      }
    }
  }
})();
