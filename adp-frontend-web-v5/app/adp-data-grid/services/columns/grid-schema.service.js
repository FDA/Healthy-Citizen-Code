;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridSchema', GridSchema);

  /** @ngInject */
  function GridSchema() {
    function getFieldsForGrid(schema) {
      return filterFields(schema.fields, [
        mapNamesToFields,
        getReadableFields,
        removeGroupFields,
        addIdAndPermissionsColumns,
      ]);
    }

    function getFieldsForDetailedView(schema) {
      return filterFields(schema.fields, [
        mapNamesToFields,
        getReadableFields,
      ]);
    }

    function filterFields(fields, pipeFunctions) {
      var pipe = _.flow(pipeFunctions);
      return pipe(fields);
    }

    function mapNamesToFields(fields) {
      return _.map(fields, function (field, key) {
        field.fieldName = key;
        return field;
      });
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
      var idColumn = {
        type: 'String',
        fieldName: '_id',
        showInDatatable: false,
      };
      var permissionsColumns = {
        type: '_Action',
        fieldName: '_action',
        showInDatatable: false,
      };

      return fields.concat(idColumn, permissionsColumns);
    }

    function isGroup(field) {
      return field.type === 'Group';
    }

    return {
      getFieldsForGrid: getFieldsForGrid,
      getFieldsForDetailedView: getFieldsForDetailedView,
    };
  }
})();
