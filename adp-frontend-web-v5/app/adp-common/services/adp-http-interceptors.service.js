;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .factory('AdpHttpInterceptor', AdpHttpInterceptor);

  /** @ngInject */
  function AdpHttpInterceptor(
    $q,
    $injector,
    $rootScope
  ) {
    return {
      responseError: function errorHandler(error) {
        var $q = $injector.get('$q');
        var $log = $injector.get('$log');

        $log.debug('Response reject: ', error);

        if (isGraphql(error.config.url)) {
          return $q.reject(error);
        }

        handleErrorsForRestApi(error);
        return $q.reject(error);
      },
      request: function requestHandler(config) {
        var AdpSessionService = $injector.get('AdpSessionService');
        if (!isApiRequest(config.url)) {
          return config;
        }

        AdpSessionService.setAuthHeaders(config);
        $rootScope.lastApiRequest = _.pick(config, ['method', 'headers', 'url', 'withCredentials']);

        return config;
      },
    };

    function isApiRequest(requestUrl) {
      var apiUrl = $injector.get('APP_CONFIG').apiUrl;
      var isAuthUrl = _.find(['login', 'register', 'forgot'], function (subStr) {
        return _.includes(requestUrl, subStr);
      });

      if (isAuthUrl) {
        return false;
      }

      return _.includes(requestUrl, apiUrl);
    }

    function isGraphql(requestUrl) {
      var apiUrl = $injector.get('APP_CONFIG').apiUrl;
      return apiUrl + '/graphql' === requestUrl;
    }

    function handleErrorsForRestApi(error) {
      var AdpSessionService = $injector.get('AdpSessionService');
      var AdpNotificationService = $injector.get('AdpNotificationService');

      var sessionExpired = isApiRequest(error.config.url) && error.status === 401;
      var hasApiError = error.status >= 400;

      if (sessionExpired) {
        return AdpSessionService.handleUnauthorized()
          .then(function () {
            return $q.reject(error);
          });
      } else if (hasApiError) {
        AdpNotificationService.notifyError(error.data.message);
      } else {
        console.error('Unknown error.')
      }

    }
  }
})();

