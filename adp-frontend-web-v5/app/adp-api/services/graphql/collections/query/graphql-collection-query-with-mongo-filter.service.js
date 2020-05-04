;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlCollectionQueryWithMongoFilter', GraphqlCollectionQueryWithMongoFilter);

  /** @ngInject */
  function GraphqlCollectionQueryWithMongoFilter(
    GraphqlCollectionFields,
    GraphqlRequest
  ) {
    return function (schema, params) {
      var params = params || {};

      return GraphqlRequest({
        name: getQueryName(schema),
        query: getQuery(schema),
        variables: params,
      });
    };

    function getQuery(schema) {
      var items = GraphqlCollectionFields.get(schema);

      return [
        'query q($sort: String, $page: Int, $perPage: Int, $mongoQuery: String) {',
          getQueryName(schema),
        '(',
          'sort: $sort,',
          'page: $page,',
          'perPage: $perPage,',
          'filter: { mongoQuery: $mongoQuery },',
        ') {',
            'count',
            items,
          '}',
        '}',
      ].join('\n');
    }

    function getQueryName(schema) {
      return schema.schemaName;
    }
  }
})();
