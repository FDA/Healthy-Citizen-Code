;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlCollectionQuery', GraphqlCollectionQuery);

  /** @ngInject */
  function GraphqlCollectionQuery(
    GraphqlCollectionQueryBuilder,
    GraphqlCollectionQueryVariables,
    GraphqlRequest,
    GraphqlHelper
  ) {
    return function (schema, params) {
      var params = params || {};
      var queryName = GraphqlHelper.collectionQueryName(schema, params);

      return GraphqlRequest({
        name: queryName,
        query: GraphqlCollectionQueryBuilder(queryName, schema, params),
        variables: GraphqlCollectionQueryVariables(schema, params),
      });
    };
  }
})();
