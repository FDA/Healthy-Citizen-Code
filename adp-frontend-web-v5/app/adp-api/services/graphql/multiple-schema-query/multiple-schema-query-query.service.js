;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlMultipleSchemasQuery', GraphqlMultipleSchemasQuery);

  /** @ngInject */
  function GraphqlMultipleSchemasQuery(
    GraphqlCollectionQueryWithMongoFilter,
    AdpUnifiedArgs,
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
        mongoQuery: evalWhereCondition({
          schema: requestSchema,
          row: params.row,
          action: params.action,
          condition: table.where,
        }),
      });

      return GraphqlCollectionQueryWithMongoFilter(requestSchema, requestParams)
        .then(function (result) {
          return [name, result.items];
        });
    }

    function getRequestSchema(table, name) {
      var APP_MODEL = window.adpAppStore.appModel();
      var schema = APP_MODEL[name];
      return _.clone(schema);
    }

    function evalWhereCondition(params) {
      var args = AdpUnifiedArgs.getHelperParamsWithConfig({
        path: '',
        action: params.action,
        formData: params.row,
        schema: params.schema,
      });

      var evaluatedCondition;
      try {
        evaluatedCondition = new Function('return ' + params.condition).call(args);
      } catch (e) {
        console.error('Error while trying to evaluate condition "' + params.condition + '": ', e);
        evaluatedCondition = {};
      }
      return JSON.stringify(evaluatedCondition);
    }
  }
})();
