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
      cloneDataSet: cloneDataSet,
      importDataSet: importDataSet,
    };

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

    function cloneDataSet(schema, record, params) {
      var mutatorName = 'datasetsClone';

      return GraphqlRequest({
        name: mutatorName,
        query: GraphqlCollectionMutationBuilder.cloneDataSet(mutatorName, schema),
        variables: {
          record: record,
          parentCollectionName: params.parentCollectionName,
          filter: JSON.stringify(params.filter) || '',
          projections: params.projections,
        },
      });
    }

    function importDataSet(schema, uploadedFile) {
      var mutatorName = 'universalImportData';

      return GraphqlRequest({
        name: mutatorName,
        query: GraphqlCollectionMutationBuilder.importDataSet(mutatorName),
        variables: {
          fileId: uploadedFile.id,
          modelName: schema.schemaName,
        },
      });
    }
  }
})();
