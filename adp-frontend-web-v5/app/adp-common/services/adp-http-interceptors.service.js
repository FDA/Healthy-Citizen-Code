;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .factory('AdpHttpInterceptor', AdpHttpInterceptor);

  /** @ngInject */
  function AdpHttpInterceptor(
    $injector,
    $rootScope
  ) {
    var AdpNotificationService = $injector.get('AdpNotificationService');
    var $q = $injector.get('$q');
    var $log = $injector.get('$log');
    var APP_CONFIG = $injector.get('APP_CONFIG');

    return {
      responseError: function errorHandler(error) {
        var AdpSessionService = $injector.get('AdpSessionService');
        $log.debug('Response reject: ', error);

        if (isGraphql(error.config.url)) {
          var beforeAction = error.status === 401 ?
            AdpSessionService.handleUnauthorized :
            $q.when;

          return beforeAction()
            .then(function () {
              return $q.reject(error);
            });
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
      var apiUrl = APP_CONFIG.apiUrl;
      var isAuthUrl = _.find(['login', 'register', 'forgot'], function (subStr) {
        return _.includes(requestUrl, subStr);
      });

      if (isAuthUrl) {
        return false;
      }

      return _.includes(requestUrl, apiUrl);
    }

    function isGraphql(requestUrl) {
      var apiUrl = APP_CONFIG.apiUrl;
      return apiUrl + '/graphql' === requestUrl;
    }

    function handleErrorsForRestApi(error) {
      var AdpSessionService = $injector.get('AdpSessionService');
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
        console.error('Unknown error.', error);
      }

    }
  }
})();

