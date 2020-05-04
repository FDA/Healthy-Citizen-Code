;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlMultipleSchemasQuery', GraphqlMultipleSchemasQuery);

  /** @ngInject */
  function GraphqlMultipleSchemasQuery(
    GraphqlCollectionQueryWithMongoFilter,
    $q
  ) {
    return function (tableDefinitions, params) {
      var params = params || {};
      var promises = _.map(tableDefinitions, function (table, name) {
        return requestSingleCollectionData(table, name, params);
      });

      return $q.all(promises)
        .then(function (results) {
          return results.reduce(function (acc, item) {
            acc[item[0]] = item[1];
            return acc;
          }, {});
        })
    };

    function requestSingleCollectionData(table, name, params) {
      var requestSchema = getRequestSchema(table, name);
      var requestParams = _.assign({}, params, {
        where: table.where,
      })

      return GraphqlCollectionQueryWithMongoFilter(requestSchema, requestParams)
        .then(function (result) {
          return [name, result.items];
        });
    }

    function getRequestSchema(table, name) {
      var APP_MODEL = window.adpAppStore.appModel();
      var schema = APP_MODEL[name];
      var requestSchema = _.clone(schema);

      requestSchema.fields = {};
      table.fields.forEach(function (name) {
        if (_.includes(['_tableLabel', '_table'], name) || _.isNil(schema.fields[name])) {
          return;
        }

        requestSchema.fields[name] = schema.fields[name];
      });

      return requestSchema;
    }
  }
})();
