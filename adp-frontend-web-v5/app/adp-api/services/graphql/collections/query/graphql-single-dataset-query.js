;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlSingleDatasetQuery', GraphqlSingleDatasetQuery);

  /** @ngInject */
  function GraphqlSingleDatasetQuery(
    GraphqlCollectionQueryBuilder,
    GraphqlCollectionFields,
    GraphqlRequest
  ) {
    return function (dataSetSchema, id) {
      var queryName = 'getSingleDataset';
      var schemaForQuery = {
        type: 'Schema',
        schemaName: 'datasetSingle',
        fields: dataSetSchema.fields.scheme.fields,
      };
      var schemeItems = GraphqlCollectionFields.get(schemaForQuery, 'scheme');

      return GraphqlRequest({
        name: queryName,
        query: [
          "query q($id: MongoId) {",
            "getSingleDataset(filter: { _id: $id }) {",
              schemeItems,
            "}",
          "}",
        ].join("\n"),
        variables: { id: id },
      });
    };
  }
})();
