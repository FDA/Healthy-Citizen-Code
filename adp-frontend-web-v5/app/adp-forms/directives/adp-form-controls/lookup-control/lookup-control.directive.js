(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('lookupControl', lookupControl);

  function lookupControl(
    AdpSchemaService,
    AdpValidationUtils,
    ControlSetterGetter
  ) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/lookup-control/lookup-control.html',
      require: '^^form',
      link: function (scope) {
        (function init() {
          scope.getterSetter = ControlSetterGetter(scope.args);
          scope.props = {
            args: scope.args,
            onValueChanged: function(e) {
              scope.getterSetter(e.value);
            },
            onTableChanged: function(e) {
              scope.props.selectedTableName = e.value;
            },
            selectedTableName: initialTableName(),
          };

          scope.multiple = scope.args.fieldSchema.type.includes('[]');
          setContainerClasses();
        })();

        function initialTableName() {
          var tables = getLookupTables();
          return _.toArray(tables)[0].table;
        }

        function setContainerClasses() {
          var hasSingleTable = Object.keys(getLookupTables()).length === 0;

          scope.fieldNameClass = 'lookup-name-' + scope.args.fieldSchema.fieldName;
          scope.columnClass = hasSingleTable ? 'single-column' : '';
        }

        function getLookupTables() {
          return _.get(scope, 'args.fieldSchema.lookup.table');
        }

        scope.isRequired = AdpValidationUtils.isRequired(scope.args.path, scope.formContext.requiredMap);
      }
    }
  }
})();
