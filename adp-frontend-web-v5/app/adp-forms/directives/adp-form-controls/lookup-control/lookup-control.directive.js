(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('lookupControl', lookupControl);

  function lookupControl(
    AdpSchemaService,
    AdpValidationUtils,
    AdpUnifiedArgs
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '<',
        adpFormData: '<',
        uiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/lookup-control/lookup-control.html',
      require: '^^form',
      link: function (scope) {
        (function init() {
          scope.args = unifiedApproachArgs();
          scope.props = {
            args: scope.args,
            onValueChanged: function(e) {
              scope.adpFormData[scope.args.modelSchema.fieldName] = e.value;
            },
            onTableChanged: function(e) {
              scope.props.selectedTableName = e.value;
            },
            selectedTableName: initialTableName(),
          };

          scope.multiple = scope.args.modelSchema.type.includes('[]');
          setContainerClasses();
        })();

        function initialTableName() {
          var tables = getLookupTables();
          return _.toArray(tables)[0].table;
        }

        function setContainerClasses() {
          var hasSingleTable = Object.keys(getLookupTables()).length === 0;

          scope.fieldNameClass = 'lookup-name-' + scope.args.modelSchema.fieldName;
          scope.columnClass = hasSingleTable ? 'single-column' : '';
        }

        function getLookupTables() {
          return _.get(scope, 'args.modelSchema.lookup.table');
        }

        function unifiedApproachArgs() {
          var formParams = scope.validationParams.formParams;

          return AdpUnifiedArgs.getHelperParamsWithConfig({
            path: formParams.path,
            formData: formParams.row,
            action: formParams.action,
            schema: formParams.modelSchema,
          });
        }

        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
      }
    }
  }
})();
