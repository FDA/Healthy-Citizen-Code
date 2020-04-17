;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridSchema', GridSchema);

  /** @ngInject */
  function GridSchema(GridOptionsHelpers) {
    function getFieldsForGrid(schema) {
      return filterFields(schema.fields, [
        _.toArray,
        getReadableFields,
        removeGroupFields,
        addIdAndPermissionsColumns,
        function (fields) {
          return sortFields(fields, 'datagridOrder');
        }
      ]);
    }

    function getFieldsForDetailedView(schema) {
      return filterFields(schema.fields, [
        _.toArray,
        getReadableFields,
        function (fields) {
          return sortFields(fields, 'detailedViewOrder');
        }
      ]);
    }

    function filterFields(fields, pipeFunctions) {
      var pipe = _.flow(pipeFunctions);
      return pipe(fields);
    }

    function getReadableFields(fields) {
      var lastFoundGroup = null;

      return fields.filter(function (field) {
        if (isGroup(field)) {
          lastFoundGroup = field;
        }

        var useParentGroupPermissionForChildField = !_.isNull(lastFoundGroup);
        if (useParentGroupPermissionForChildField) {
          return hasReadPermission(lastFoundGroup);
        }

        return hasReadPermission(field);
      });
    }

    function hasReadPermission(field) {
      return _.get(field, 'fieldInfo.read', true);
    }

    function removeGroupFields(fields) {
      _.remove(fields, isGroup);

      return fields;
    }

    // adding columns that not specified in schema
    // _id - for sorting and record identification
    // _actions - individual records permissions
    function addIdAndPermissionsColumns(fields) {
      var permissionsColumns = {
        type: '_Action',
        fieldName: '_action',
        allowSearch: false,
        showInDatatable: false,
      };

      return fields.concat(permissionsColumns);
    }

    function sortFields(fields, orderProperty) {
      var groupedFields = groupFieldsForDetailedView(fields);

      _.forEach(groupedFields, function (f) {
        if (_.isArray(f.fields)) {
          f.fields = _.sortBy(f.fields, function (f) {
            return getOrder(f, orderProperty);
          });
        } else if (f.fields) {
          f.fields = sortObjectFields(f.fields, orderProperty);
        }

        return f;
      });

      var sorted = _.sortBy(groupedFields, function (f) {
        return getOrder(f, orderProperty);
      });

      return flattenGroup(sorted);
    }

    function groupFieldsForDetailedView(fields) {
      var groupedFields = [];
      var lastGroupFields = null;

      _.forEach(fields, function (field) {
        var isGroup = field.type === 'Group';
        if (isGroup) {
          var newGroup = field;
          newGroup.fields = [];
          lastGroupFields = newGroup.fields;
        }

        if (lastGroupFields === null || isGroup) {
          groupedFields.push(field);
        } else {
          lastGroupFields.push(field);
        }
      });

      return groupedFields;
    }

    function flattenGroup(fields) {
      var result = [];

      _.forEach(fields, function (field) {
        result.push(field);

        if (field.type === 'Group') {
          _.forEach(field.fields, function (f) {
            result.push(f);
          });
        }
      });

      return result;
    }

    function sortObjectFields(objectFields, orderProperty) {
      var sortedKeys = _.sortBy(_.keys(objectFields), function (key) {
        var field = _.get(objectFields, key);
        return getOrder(field, orderProperty);
      });

      var sortedFields = {};
      _.forEach(sortedKeys, function (key) {
        var currentField = objectFields[key];
        if (currentField.fields) {
          currentField.fields = sortObjectFields(currentField.fields, orderProperty);
        }

        sortedFields[key] = objectFields[key];
      });

      return sortedFields;
    }

    function isGroup(field) {
      return field.type === 'Group';
    }

    function getOrder(field, property) {
      var val = Number(field[property]);

      return _.isNaN(val) ? undefined : val;
    }

    function getSchemaForVisibleColumns(schema) {
      var visibleColumns = GridOptionsHelpers.getVisibleColumnNames();
      var resultSchema = _.cloneDeep(schema);

      resultSchema.fields = {};
      visibleColumns.forEach(function (name) {
        resultSchema.fields[name] = schema.fields[name];
      });

      return resultSchema;
    }

    return {
      getFieldsForGrid: getFieldsForGrid,
      getFieldsForDetailedView: getFieldsForDetailedView,
      getSchemaForVisibleColumns: getSchemaForVisibleColumns,
    };
  }
})();
