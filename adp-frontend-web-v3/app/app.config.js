;(function () {
  'use strict';

  angular
    .module('app')
    .config(httpConfig)
    .config(appConfig);

  /** @ngInject */
  function appConfig(
    localStorageServiceProvider,
    $logProvider,
    CONSTANTS,
    APP_PREFIX
  ) {
    $logProvider.debugEnabled(CONSTANTS.debug);

    localStorageServiceProvider
      .setPrefix(APP_PREFIX);
  }

  /** @ngInject */
  function httpConfig($httpProvider) {
    $httpProvider.interceptors.push('AdpHttpInterceptor');
  }
})();