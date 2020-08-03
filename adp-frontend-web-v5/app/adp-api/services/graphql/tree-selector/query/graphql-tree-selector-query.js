;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlTreeSelectorQuery', GraphqlTreeSelectorQuery);

  /** @ngInject */
  function GraphqlTreeSelectorQuery(
    GraphqlLookupQueryBuilder,
    GraphqlLookupQueryVariables,
    GraphqlRequest
  ) {
    return function (args, params) {
      var queryName = getQueryName(args.fieldSchema);

      return GraphqlRequest({
        name: queryName,
        query: queryBody(queryName),
        variables: queryVars(params),
      });
    };

    function getQueryName(field) {
      var tableName = _.keys(field.table)[0];
      var tableId = field.table.id;

      return ['Treeselector', tableId, tableName].join('_');
    }

    function queryBody(queryName) {
      return [
        'query q($q: String, $foreignKeyVal: MongoId, $page: Int, $perPage: Int, ) {',
          queryName + ' (filter: { q: $q, foreignKeyVal: $foreignKeyVal }, page: $page, perPage: $perPage) {',
          'items {',
            '_id',
            'label',
            'table',
            'isLeaf',
          '}',
          'count',
          '}',
        '}',
      ].join('\n')
    }

    function queryVars(params) {
      return {
        q: params.searchValue,
        foreignKeyVal: params.foreignKeyVal,
        page: page(params),
        perPage: params.take || 20,
      }
    }

    function page(params) {
      var page = Math.floor(params.skip / params.take) + 1;

      if (_.isNaN(page)) {
        return 1;
      }

      return page;
    }
  }
})();
