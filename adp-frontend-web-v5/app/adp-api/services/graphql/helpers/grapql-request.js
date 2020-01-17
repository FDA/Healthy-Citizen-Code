;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlRequest', GraphqlRequest);

  /** @ngInject */
  function GraphqlRequest(
    ServerError,
    APP_CONFIG,
    $http
  ) {
    function endpoint() {
      return [APP_CONFIG.apiUrl, 'graphql'].join('/')
    }

    return function (requestParams) {
      var body = {
        query: requestParams.query,
        variables: requestParams.variables,
      };

      return $http.post(endpoint(), body)
        .then(function (res) {
          if (hasGraphqlError(res)) {
           throwIfErrors(res);
          }

          return res.data.data[requestParams.name];
        })
        .catch(function (err) {
          if (hasGraphqlError(err)) {
            throwIfErrors(err);
          }

          throw err;
        });
    }

    function throwIfErrors(res) {
      var errorsMessages = res.data.errors.map(function (err) {
        return err.message;
      });

      throw new ServerError(errorsMessages);
    }

    function hasGraphqlError(res) {
      return _.hasIn(res, 'data.errors');
    }
  }
})();
