(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('gridControl', gridControl);

  function gridControl(
    GraphqlMultipleSchemasQuery,
    GRID_CONTROL_ACTIONS
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
        scope.schema = mergeSchema(scope.field.table);
        setParametersToSchema(scope.field, scope.schema);
        addActions(scope.schema, scope.field.table);
        showHideHeader(scope.field.showHeader, scope.schema);

        scope.options = {
          dataSource: {
            store: new DevExpress.data.CustomStore({
              load: function () {
                return GraphqlMultipleSchemasQuery(scope.field.table, {
                  row: _.cloneDeep(scope.adpFormData),
                  action: scope.validationParams.formParams.action,
                })
                  .then(function (data) {
                    return mergeGridData(data, scope.field.table);
                  })
                  .then(function (mergeData) {
                    return {
                      data: mergeData,
                      totalCount: mergeData.length,
                    };
                  })
              }
            })
          }
        };

        function mergeSchema(tableDefinition) {
          var resultedSchema = _.cloneDeep(scope.validationParams.schema);
          resultedSchema.fields = {
            $meta_table: {
              type: 'String',
              description: 'Service column. Holds original schema name.',
              showInDatatable: false,
              fieldName: '$meta_table',
            }
          };

          var tablesList = getUniqueTablesList(tableDefinition);

          if (_.includes(tablesList, '_tableLabel')) {
            resultedSchema.fields._tableLabel = { type: 'String', fullName: '_tableLabel', fieldName: '_tableLabel' };
          }

          if (_.includes(tablesList, '_table')) {
            resultedSchema.fields._table =  { type: 'String', fullName: '_table', fieldName: '_table' };
          }

          _.keys(tableDefinition).forEach(function (tableName) {
            var schema = getSchemaByName(tableName);
            _.merge(resultedSchema.fields, schema.fields);
          });

          _.each(resultedSchema.fields, function (field, fieldName) {
            field.showInDatatable = _.includes(tablesList, fieldName);
          });

          return resultedSchema;
        }

        function getSchemaByName(name) {
          var APP_MODEL = window.adpAppStore.appModel();
          return _.cloneDeep(APP_MODEL[name]);
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
        }

        function mergeGridData(data, tables) {
          _.each(tables, function (table, schemaName) {
            var hasTable = _.includes(table.fields, '_table');
            var hasTableLabel = _.includes(table.fields, '_tableLabel');

            data[schemaName].forEach(function (item) {
              hasTableLabel && (item._tableLabel = table.tableLabel || _.startCase(schemaName));
              hasTable && (item._table = schemaName);
              item.$meta_table = schemaName;
              item._actions = _.assign(data._actions, { gridControlEdit: true });
            });
          });

          return _.flow(_.toArray, _.flatten)(data);
        }

        function getUniqueTablesList(tableDef) {
          return _.flow(
            function (defObj) {
              return _.map(defObj, function (item) {
                return item.fields;
              });
            },
            _.flatten,
            _.uniq
          )(tableDef);
        }
      }
    }
  }
})();
