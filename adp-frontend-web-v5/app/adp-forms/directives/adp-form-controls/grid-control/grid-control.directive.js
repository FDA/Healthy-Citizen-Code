(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('gridControl', gridControl);

  function gridControl(
    GraphqlMultipleSchemasQuery
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/grid-control/grid-control.html',
      require: '^^form',
      link: function (scope) {
        scope.schema = mergeSchema(scope.field.table);
        setParametersToSchema(scope.field, scope.schema);
        addActions(scope.schema, scope.field.table)
        customizeToolbar(scope.schema);
        showHideHeader(scope.field.showHeader, scope.schema);

        scope.options = {
          dataSource: {
            store: new DevExpress.data.CustomStore({
              load: function () {
                return GraphqlMultipleSchemasQuery(scope.field.table)
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

          _.each(tableDefinition, function (table, name) {
            var schema = getSchemaByName(name);
            table.fields.forEach(function (fieldName) {
              if (fieldName === '_tableLabel') {
                resultedSchema.fields._tableLabel = { type: 'String', fullName: '_tableLabel', fieldName: '_tableLabel' };
              } else if (fieldName === '_table') {
                resultedSchema.fields._table =  { type: 'String', fullName: '_table', fieldName: '_table' };
              } else {
                resultedSchema.fields[fieldName] = _.isNil(schema.fields[fieldName]) ?
                  { type: 'String', fieldName: _.startCase(fieldName) } :
                  schema.fields[fieldName];
              }
            });
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

        function customizeToolbar(schema) {
          var disabledActions = [
            'print', 'viewDetails', 'quickFilter', 'import', 'manageViews',
            'create', 'update', 'delete', 'clone',
          ];
          removeActions(disabledActions, schema);
        }

        function showHideHeader(showHeader, schema) {
          if (showHeader) {
            return;
          }

          removeActions(['search', 'export', 'group', 'chooseColumns', 'gridCreateControl'], schema);
        }

        function removeActions(actionsList, schema) {
          actionsList.forEach(function (actionName) {
            _.unset(schema.actions.fields, actionName);
          });
        }

        function addActions(schema, tables) {
          schema.actions.fields.gridControlEdit = {
            permissions: 'accessAsUser',
            description: 'Edit',
            fullName: 'Edit',
            action: {
              type: 'module',
              link: "AdpGridControlActions",
              method: "edit",
            }
          };

          schema.actions.fields.gridCreateControl = {
            actionOrder: 1,
            backgroundColor: "#2196F3",
            borderColor: "#0c7cd5",
            description: "Create new record",
            fullName: "Create Record",
            position: "grid.top.left",
            textColor: "white",
            "icon": {
              "link": "columns"
            },
            action: {
              type: 'module',
              link: 'AdpGridControlActions',
              method: "create",
            },
            __name: 'create',
            table: tables,
          }
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
      }
    }
  }
})();
