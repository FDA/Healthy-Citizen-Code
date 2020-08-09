;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .factory('AdpHttpInterceptor', AdpHttpInterceptor);

  /** @ngInject */
  function AdpHttpInterceptor(
    $q,
    $injector
  ) {
    function isApiRequest(requestUrl) {
      var CONSTANTS = $injector.get('CONSTANTS');

      return requestUrl.indexOf(CONSTANTS.apiUrl) > -1;
    }

    function errorHandler(error) {
      var $q = $injector.get('$q');
      var AdpSessionService = $injector.get('AdpSessionService');
      var $log = $injector.get('$log');
      var AdpNotificationService = $injector.get('AdpNotificationService');

      $log.debug('Response reject: ', error);

      var sessionExpired = error.status === 401 && AdpSessionService.isAuthorized();

      if (sessionExpired) {
        AdpSessionService.handleUnauthorized();
        return $q.reject(error);
      }

      AdpNotificationService.notifyError(error.data.message);
      return $q.reject(error);
    }

    function requestHandler(config) {
      var AdpSessionService = $injector.get('AdpSessionService');

      if (isApiRequest(config.url) && AdpSessionService.isAuthorized()) {
        AdpSessionService.setAuthHeaders(config);
      }

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

