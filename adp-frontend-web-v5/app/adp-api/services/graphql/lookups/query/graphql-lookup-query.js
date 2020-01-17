;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlLookupQuery', GraphqlLookupQuery);

  /** @ngInject */
  function GraphqlLookupQuery(
    GraphqlLookupQueryBuilder,
    GraphqlLookupQueryVariables,
    GraphqlRequest
  ) {
    return function (args, params) {
      var queryName = lookupQueryName(args.modelSchema, params.selectedTable);
      var lookupId = args.modelSchema.lookup.id;

      return GraphqlRequest({
        name: queryName,
        query: GraphqlLookupQueryBuilder(queryName, params.selectedTable, lookupId),
        variables: GraphqlLookupQueryVariables(params, args),
      });
    };

    function lookupQueryName(field, table) {
      return ['Lookup', field.lookup.id, table.table].join('_');
    }
  }
})();
