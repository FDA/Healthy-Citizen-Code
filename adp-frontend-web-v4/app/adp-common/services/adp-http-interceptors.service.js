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
    function isApiRequest(requestUrl) {
      var apiUrl = $injector.get('APP_CONFIG').apiUrl;

      if (_.includes(requestUrl, 'login') || _.includes(requestUrl, 'register')) {
        return false;
      }

      return _.includes(requestUrl, apiUrl);
    }

    function errorHandler(error) {
      var $q = $injector.get('$q');
      var AdpSessionService = $injector.get('AdpSessionService');
      var $log = $injector.get('$log');
      var AdpNotificationService = $injector.get('AdpNotificationService');

      // by default angular uses $http for a lot of requests
      // isApiRequest to filter
      var sessionExpired = isApiRequest(error.config.url) &&
        error.status === 401;

      $log.debug('Response reject: ', error);

      if (sessionExpired) {
        return AdpSessionService.handleUnauthorized()
          .then(function () {
            return $q.reject(error);
          });
      }

      if (_.hasIn(error, 'data.message')) {
        AdpNotificationService.notifyError(error.data.message);
      }

      return $q.reject(error);
    }

    function requestHandler(config) {
      var AdpSessionService = $injector.get('AdpSessionService');
      if (!isApiRequest(config.url)) {
        return config;
      }

      AdpSessionService.setAuthHeaders(config);
      $rootScope.lastApiRequest = _.pick(config, ['method', 'headers', 'url', 'withCredentials']);

      return config;
    }

    function responseHandler(response) {
      var $q = $injector.get('$q'), message;
      var AdpNotificationService = $injector.get('AdpNotificationService');

      if (!_.isUndefined(response.data.success)) {
        if (!response.data.success) {
          message = response.data.message;
          $q.reject(message);
          AdpNotificationService.notifyError(message);
        }
      }

      return response;
    }

    return {
      'responseError': errorHandler,
      'request': requestHandler,
      'response': responseHandler
    };
  }
})();

