;(function () {
  'use strict';

  angular
    .module('app.hcCommon')
    .factory('HcHttpInterceptor', HcHttpInterceptor);

  /** @ngInject */
  function HcHttpInterceptor(
    $q,
    $injector
  ) {
    function isApiRequest(requestUrl) {
      var CONSTANTS = $injector.get('CONSTANTS');

      return requestUrl.indexOf(CONSTANTS.apiUrl) > -1;
    }

    function errorHandler(error) {
      var $q = $injector.get('$q');
      var HcSessionService = $injector.get('HcSessionService');
      var $log = $injector.get('$log');
      var HcNotificationService = $injector.get('HcNotificationService');

      $log.debug('Response reject: ', error);

      var sessionExpired = error.status === 401 && HcSessionService.isAuthorized();

      if (sessionExpired) {
        HcSessionService.handleUnauthorized();
        return $q.reject(error);
      }

      HcNotificationService.notifyError(error.data.message);
      return $q.reject(error);
    }

    function requestHandler(config) {
      var HcSessionService = $injector.get('HcSessionService');
      var $log = $injector.get('$log');

      if (isApiRequest(config.url) && HcSessionService.isAuthorized()) {
        HcSessionService.setAuthHeaders(config);
      }

      return config;
    }

    return {
      'responseError': errorHandler,
      'request': requestHandler
    };
  }
})();

