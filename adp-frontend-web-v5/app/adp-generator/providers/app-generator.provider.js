;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .provider('AppGenerator', AppGenerator);

  function AppGenerator(
    AdpStateGeneratorProvider,
    $urlRouterProvider,
    APP_CONFIG
  ) {
    var service = {
      generateApp: generateApp
    };

    service.$get = function () {
      return service;
    };

    function generateApp() {
      var APP_MODEL = window.adpAppStore.appModel();
      var INTERFACE = window.adpAppStore.appInterface();
      var DEFAULT_STATE;

      try {
        DEFAULT_STATE = AdpStateGeneratorProvider.getDefaultStateParams(INTERFACE.mainMenu);
        window.adpAppStore.defaultState(DEFAULT_STATE);

        $urlRouterProvider.otherwise(function () {
          var authSetting = window.adpAppStore.appInterface().app.auth;
          var loginUrl = !!APP_CONFIG.appSuffix ? (APP_CONFIG.appSuffix + '/login') : '/login';

          if (authSetting.requireAuthentication && lsService.isGuest()) {
            return loginUrl;
          } else {
            return DEFAULT_STATE.url;
          }
        });
      } catch (e) {
        console.log('Menu item creation failed due to error: ', e)
      }

      try {
        AdpStateGeneratorProvider.createDashboards(INTERFACE.mainMenu);
      } catch (e) {
        console.log('Menu item creation failed due to error: ', e)
      }

      try {
        AdpStateGeneratorProvider.createCustomPages(INTERFACE);
      } catch (e) {
        console.log('Custom page creation failed due to error: ', e)
      }

      try {
        AdpStateGeneratorProvider.createStates(APP_MODEL, INTERFACE);
      } catch (e) {
        console.log('Schema pages creation failed due to error: ', e)
      }

      try {
        AdpStateGeneratorProvider.createBuiltInStates(APP_MODEL, INTERFACE);
      } catch (e) {
        console.log('Built in page creation failed due to error: ', e)
      }
    }

    return service;
  }
})();
