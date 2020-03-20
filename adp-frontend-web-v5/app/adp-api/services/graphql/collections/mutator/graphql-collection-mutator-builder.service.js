;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlCollectionMutationBuilder', GraphqlCollectionMutationBuilder);

  /** @ngInject */
  function GraphqlCollectionMutationBuilder() {
    return {
      create: create,
      update: update,
      delete: deleteRecord,
      cloneDataSet: cloneDataSet,
      importDataSet: importDataSet,
    };

    function create(mutationName, schema) {
      var recordType = getRecordType(schema.schemaName);

      return [
        'mutation m(',
          '$record: ' + recordType,
        ') {',
          mutationName + ' (record: $record) { _id }',
        '}',
      ].join('\n');
    }

    function update(mutationName, schema) {
      var recordType = getRecordType(schema.schemaName);

      return [
        'mutation m(',
          '$record: ' + recordType,
          '$filter: MongoIdInput!',
        ') {',
        mutationName + ' (record: $record, filter: $filter) { _id }',
        '}',
      ].join('\n');
    }

    function deleteRecord(mutationName) {
      return [
        'mutation m($filter: MongoIdInput!) {',
          mutationName + ' (filter: $filter) { deletedCount }',
        '}',
      ].join('\n');
    }

    function cloneDataSet(mutationName) {
      return [
        'mutation m(',
          '$record: datasetsInputWithoutId',
          '$parentCollectionName: String!',
          '$filter: String!,',
          '$projections: [String]!',
        ') {',
        mutationName + '(',
          'record: $record, parentCollectionName: $parentCollectionName, filter: { dxQuery: $filter }, projections: $projections',
          ') { _id }',
        '}',
      ].join('\n');
    }

    function importDataSet(mutationName) {
      return [
        'mutation m(',
        '$fileId: String!',
        '$modelName: String!',
        ') {',
        mutationName + ' (',
        'fileId: $fileId, modelName: $modelName',
        ') { importedRowsNumber errors }',
        '}',
      ].join('\n');
    }

    function getRecordType(schemaName) {
      return schemaName + 'InputWithoutId';
    }
  }
})();
