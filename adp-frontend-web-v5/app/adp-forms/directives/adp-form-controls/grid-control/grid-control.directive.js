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
        args: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/grid-control/grid-control.html',
      require: '^^form',
      link: function (scope) {
        var fieldSchema = scope.args.fieldSchema;
        createSchema();
        addWatcherForAction();

        scope.options = {
          dataSource: {
            store: new DevExpress.data.CustomStore({
              load: function () {
                return GridControlHelper.getMergedData(fieldSchema.table, scope.args.row, scope.args.action);
              }
            })
          }
        };

        function createSchema() {
          scope.modelSchemaForGrid = GridControlHelper.mergeSchema(fieldSchema, scope.args.modelSchema);

          setParametersToSchema(fieldSchema, scope.modelSchemaForGrid);
          addActions(scope.modelSchemaForGrid, fieldSchema.table);
          showHideHeader(fieldSchema.showHeader, scope.modelSchemaForGrid);
        }

        function addWatcherForAction() {
          if (scope.args.action !== 'create') {
            return;
          }

          var unbind = scope.$watch('args.action', function (newValue) {
            if (newValue !== 'update') { return; }
            createSchema();
            unbind();
          });
        }

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

        function addActions(schema, tables) {
          schema.actions.fields = _.cloneDeep(GRID_CONTROL_ACTIONS);
          schema.actions.fields.gridCreateControl.table = tables;

          var createDataGetter = function (schemaName) {
            return preparePresetData(tables[schemaName].create || {});
          }

          if (schema.actions.fields.gridCreateControl) {
            var newRecordsAllowed = scope.args.action !== 'update';
            schema.actions.fields.gridCreateControl.params = {
              createDataGetter: createDataGetter,
              disabled: newRecordsAllowed,
            }
          }
        }

        function preparePresetData(fields) {
          var args = AdpUnifiedArgs.getHelperParamsWithConfig({
            path: scope.args.path,
            formData: scope.args.row,
            schema: scope.modelSchemaForGrid,
            action: ACTIONS.CREATE,
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
