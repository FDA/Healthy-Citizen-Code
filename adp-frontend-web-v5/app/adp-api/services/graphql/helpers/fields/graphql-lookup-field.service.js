;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlLookupField', GraphqlLookupField);

  /** @ngInject */
  function GraphqlLookupField(GraphqlHelper) {
    return {
      get: get
    };

    function get(field, name) {
      var fieldsString;

      if (lookupHasMultipleTable(field)) {
        fieldsString = getLookupFieldsWithMultipleTables(field);
      } else {
        fieldsString = getLookupFieldsWithSingTables(field);
      }

      return GraphqlHelper.wrapFieldString(fieldsString, name);
    }

    function lookupHasMultipleTable(field) {
      return _.values(field.lookup.table).length > 1;
    }

    function getLookupFieldsWithMultipleTables(field) {
      var tables = _.values(field.lookup.table);

      return tables.map(function (table) {
        var enumName = lookupEnumName(field, table);
        var fieldsString = lookupItems(table);

        return GraphqlHelper.wrapFieldString(fieldsString, enumName);
      }).join('\n');
    }

    function lookupEnumName(field, table) {
      return '... on ' + ['Lookup', field.lookup.id, table.table].join('_');
    }

    function getLookupFieldsWithSingTables(field) {
      var table = _.values(field.lookup.table)[0];
      return lookupItems(table);
    }

    function lookupItems(table) {
      var fields = [
        '_id',
        'label',
        'table',
      ];

      if (table.data) {
        fields.push(getDataFieldsForLookup(table));
      }

      return fields.join('\n');
    }

    function getDataFieldsForLookup(table) {
      var dataFields = Object.keys(table.data).join('\n');
      return GraphqlHelper.wrapFieldString(dataFields, 'data');
    }
  }
})();
