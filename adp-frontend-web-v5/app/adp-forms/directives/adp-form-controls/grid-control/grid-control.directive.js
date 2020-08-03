(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('gridControl', gridControl);

  function gridControl(
    AdpUnifiedArgs,
    GraphqlMultipleSchemasQuery,
    GridControlHelper,
    GRID_CONTROL_ACTIONS,
    ACTIONS
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '<',
        adpFormData: '<',
        uiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/grid-control/grid-control.html',
      require: '^^form',
      link: function (scope) {
        var newRecordsAllowed = scope.validationParams.formParams.action === 'update';

        scope.schema = GridControlHelper.mergeSchema(scope.field.table, scope.validationParams.schema);
        setParametersToSchema(scope.field, scope.schema);
        addActions(scope.schema, scope.field.table, newRecordsAllowed);
        showHideHeader(scope.field.showHeader, scope.schema);

        scope.options = {
          dataSource: {
            store: new DevExpress.data.CustomStore({
              load: function () {
                return GridControlHelper.getMergedData(
                  scope.field.table, scope.adpFormData, scope.validationParams.formParams.action)
              }
            })
          }
        };

        function setParametersToSchema(field, schema) {
          var defaults = {
            remoteOperations: {
              grouping: false,
              groupPaging: false,
              sorting: false,
            },
            stateStoring: { enabled: false },
            filterRow: { visible: false },
            pager: { visible: false },
            paging: { enabled: false },
            height: 200,
          };

          schema.parameters = _.merge({}, defaults, field.parameters);
        }

        function showHideHeader(showHeader, schema) {
          if (showHeader) {
            return;
          }

          _.forEach(schema.actions.fields, function (action, name) {
            _.startsWith(action.position, 'grid.top.') && _.unset(schema.actions.fields, name);
          });
        }

        function addActions(schema, tables, newRecordsAllowed) {
          schema.actions.fields = _.cloneDeep(GRID_CONTROL_ACTIONS);
          schema.actions.fields.gridCreateControl.table = tables;

          var createDataGetter = function (schemaName) {
            return preparePresetData(tables[schemaName].create || {});
          }

          if (schema.actions.fields.gridCreateControl) {
            schema.actions.fields.gridCreateControl.params = {
              createDataGetter: createDataGetter,
              disabled: !newRecordsAllowed,
            }
          }
        }

        function preparePresetData(fields) {
          var args = AdpUnifiedArgs.getHelperParamsWithConfig({
            path: scope.field.fieldName,
            formData: scope.adpFormData,
            action: ACTIONS.CREATE,
            schema: scope.schema
          });

          return _.mapValues(fields, function(field){
            return getPresetFieldValue(field, args);
          })
        }

        function getPresetFieldValue(expression, args) {
          try {
            return new Function("return " + expression).call(args);
          } catch(e){
            console.error('Error while trying to evaluate create preset expression "' + expression + '": ', e);
            return expression;
          }
        }
      }
    }
  }
})();
