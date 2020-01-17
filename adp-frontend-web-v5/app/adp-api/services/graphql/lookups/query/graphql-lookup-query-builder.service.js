;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlLookupQueryBuilder', GraphqlLookupQueryBuilder);

  /** @ngInject */
  function GraphqlLookupQueryBuilder() {
    return function (queryName, tableDef, lookupId) {
      return ['query (',
          typeDefinitions(tableDef, lookupId),
        ') {',
        queryName,
        '(',
          'filter: $filter',
          'page: $page,',
          'perPage: $perPage,',
        ')',
        '{',
          'count',
          'items { ',
            lookupItems(tableDef),
          '}',
        '}',
        '}'].join('\n');
    };

    function typeDefinitions(tableDef, lookupId) {
      var types = [
        '$page: Int',
        '$perPage: Int',
        '$filter: ' + filterType(tableDef, lookupId),
      ];

      return types.join(', ');
    }

    function filterType(tableDef, lookupId) {
      return tableDef.where ?
        'lookupFilter_' + lookupId :
        'lookupFilter';
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
      return 'data {'.concat(dataFields, '}') ;
    }
  }
})();
