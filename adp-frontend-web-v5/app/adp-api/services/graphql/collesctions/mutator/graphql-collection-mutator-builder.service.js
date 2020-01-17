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
    }

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

    function getRecordType(schemaName) {
      return schemaName + 'InputWithoutId';
    }
  }
})();
