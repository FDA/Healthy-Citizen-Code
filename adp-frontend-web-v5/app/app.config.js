;(function () {
  'use strict';

  angular
    .module('app')
    .config(httpConfig)
    .config(appConfig);

  /** @ngInject */
  function appConfig(
    $logProvider,
    $locationProvider,
    APP_CONFIG
  ) {
    $logProvider.debugEnabled(APP_CONFIG.debug);
    $locationProvider.hashPrefix('');
  }

  /** @ngInject */
  function httpConfig($httpProvider) {
    $httpProvider.interceptors.push('AdpHttpInterceptor');
    $httpProvider.defaults.withCredentials = true;
  }
})();
