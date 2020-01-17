;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('ApiService', ApiService);

  /** @ngInject */
  function ApiService(
    AdpSchemaService,
    APP_CONFIG,
    $http
  ) {
    // !!!!!!!!!! DEPRECATED
    function get(schema) {
      return $http.get(endpoint(schema))
        .then(function (response) {
          return response.data.data;
        });
    }

    function create(schema, data) {
      return $http.post(endpoint(schema), { 'data': data });
    }

    function update(schema, data) {
      return $http.put(endpoint(schema, data._id), { 'data': data });
    }

    function deleteRecord(schema, data) {
      return $http.delete(endpoint(schema, data._id));
    }

    function endpoint(schema, id) {
      var link = schema.schemaName;
      var endpointSegments = [APP_CONFIG.apiUrl, link];

      if (id) {
        endpointSegments.push(id);
      }

      return endpointSegments.join('/')
    }

    return {
      get: get,
      create: create,
      clone: create,
      update: update,
      delete: deleteRecord,
    }
  }
})();
