;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlCollectionMutator', GraphqlCollectionMutator);

  /** @ngInject */
  function GraphqlCollectionMutator(
    GraphqlCollectionMutationBuilder,
    GraphqlRequest
  ) {
    return {
      create: create,
      clone: create,
      update: update,
      delete: deleteRecord,
    }

    function create(schema, record) {
      var mutatorName = schema.schemaName + 'Create';

      return GraphqlRequest({
        name: mutatorName,
        query: GraphqlCollectionMutationBuilder.create(mutatorName, schema),
        variables: { record: record },
      });
    }

    function update(schema, record) {
      var mutatorName = schema.schemaName + 'UpdateOne';
      var recordWithoutId = _.cloneDeep(record);
      _.unset(recordWithoutId, '_id');
      _.unset(recordWithoutId, '_actions');

      return GraphqlRequest({
        name: mutatorName,
        query: GraphqlCollectionMutationBuilder.update(mutatorName, schema),
        variables: {
          record: recordWithoutId,
          filter: { _id: record._id },
        },
      });
    }

    function deleteRecord(schema, record) {
      var mutatorName = schema.schemaName + 'DeleteOne';

      return GraphqlRequest({
        name: mutatorName,
        query: GraphqlCollectionMutationBuilder.delete(mutatorName),
        variables: {
          filter: { _id: record._id },
        },
      });
    }
  }
})();
