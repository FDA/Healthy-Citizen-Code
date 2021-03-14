(function () {
  "use strict";

  angular
    .module("app.adpForms")
    .factory("GridControlHelper", GridControlHelper);

  function GridControlHelper(GraphqlMultipleSchemasQuery) {
    return {
      getMergedData: getMergedData,
      mergeSchema: mergeSchema,
    };

    function getMergedData(table, row, action) {
      return GraphqlMultipleSchemasQuery(table, {
        row: _.cloneDeep(row),
        action: action,
      })
        .then(function (data) {
          return mergeGridData(data, table);
        })
        .then(function (mergeData) {
          return {
            data: mergeData,
            totalCount: mergeData.length,
          };
        })
    }

    function mergeSchema(fieldSchema, initialSchema) {
      var tableDefinition = fieldSchema.table;
      var resultedSchema = initialSchema ? _.cloneDeep(initialSchema) : {};
      resultedSchema.fullName = fieldSchema.fullName;
      resultedSchema.schemaName = fieldSchema.fieldName;

      resultedSchema.fields = {
        $meta_table: {
          type: 'String',
          description: 'Service column. Holds original modelSchemaForGrid name.',
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

    function mergeGridData(data, tables) {
      _.each(tables, function (table, schemaName) {
        var hasTable = _.includes(table.fields, "_table");
        var hasTableLabel = _.includes(table.fields, "_tableLabel");

        data[schemaName].forEach(function (item) {
          hasTableLabel && (item._tableLabel = table.tableLabel || _.startCase(schemaName));
          hasTable && (item._table = schemaName);
          item.$meta_table = schemaName;
          item._actions = _.assign(data._actions, {gridControlEdit: true});
        });
      });

      return _.flow(_.toArray, _.flatten)(data);
    }

    function getSchemaByName(name) {
      var APP_MODEL = window.adpAppStore.appModel();
      return _.cloneDeep(APP_MODEL[name]);
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
})();
