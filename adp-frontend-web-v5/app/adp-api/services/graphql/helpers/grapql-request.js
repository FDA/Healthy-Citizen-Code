;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlRequest', GraphqlRequest);

  /** @ngInject */
  function GraphqlRequest(
    ServerError,
    APP_CONFIG,
    AdpUserActivityHelper,
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
          var resData = _.get(res.data, 'data.' + requestParams.name);
          if (resData !== null && hasGraphqlError(res)) {
            warnErrors(res, requestParams.name);
            return resData;
          }

          if (hasGraphqlError(res)) {
           throwIfErrors(res);
          }

          AdpUserActivityHelper.resetUserActivityTimer();

          return _.get(res.data, 'data.' + requestParams.name);
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

    function warnErrors(res) {
      var errorsMessages = res.data.errors.map(function (err) {
        return err.message;
      }).join('\n');

      console.error('Server Error: ' + errorsMessages);
    }

    function hasGraphqlError(res) {
      return _.hasIn(res, 'data.errors');
    }
  }
})();
