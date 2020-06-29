(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('lookupSelectorMultiple', lookupSelectorMultiple);

  function lookupSelectorMultiple(
    LookupDxConfig,
    LookupDataSource,
    AdpFieldsService
  ) {
    return {
      restrict: 'AE',
      scope: {
        props: '=',
      },
      replace: true,
      template: '<div dx-tag-box="config"></div>',
      link: function (scope, element) {
        (function init() {
          scope.config = AdpFieldsService.configFromParameters(
            scope.props.args.modelSchema,
            LookupDxConfig.multiple(scope.props)
          );
          addTableWatcher(scope.props);
        })();

        function addTableWatcher(props) {
          scope.$watch('props.selectedTableName', function (tableName) {
            var instance = element.dxTagBox('instance');
            if (instance && tableName) {
              instance.option('dataSource', LookupDataSource(props.args, props.selectedTableName));
            }
          });
        }
      }
    }
  }
})();
