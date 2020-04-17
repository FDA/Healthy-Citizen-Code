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
    APP_CONFIG,
    $provide
  ) {
    $provide.decorator('$sniffer', function($delegate) {
      $delegate.history = !window.location.hash;
      return $delegate;
    });

    $logProvider.debugEnabled(APP_CONFIG.debug);
    $locationProvider.html5Mode(true);
    $locationProvider.hashPrefix('');
  }

  /** @ngInject */
  function httpConfig($httpProvider) {
    $httpProvider.interceptors.push('AdpHttpInterceptor');
    $httpProvider.defaults.withCredentials = true;
  }
})();
