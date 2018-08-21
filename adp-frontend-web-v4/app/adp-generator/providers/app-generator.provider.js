;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .provider('AppGenerator', AppGenerator);

  function AppGenerator(
    AdpMenuGeneratorProvider,
    AdpStateGeneratorProvider,
    $urlRouterProvider,
    $provide
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
      var MENU_ITEMS, DEFAULT_STATE, DASHBOARD;

      try {
        MENU_ITEMS = AdpMenuGeneratorProvider.createMenuItems(INTERFACE.mainMenu);
        window.adpAppStore.menuItems(MENU_ITEMS);
      } catch(e) {
        console.log('Menu item creation failed due to error: ', e)
      }

      try {
        DASHBOARD = AdpStateGeneratorProvider.findDashboard(MENU_ITEMS);
        DASHBOARD && $provide.constant('DASHBOARD', DASHBOARD);
      } catch(e) {
        console.log('Menu item creation failed due to error: ', e)
      }

      try {
        DEFAULT_STATE = AdpMenuGeneratorProvider.getDefaultStateParams(INTERFACE.mainMenu);
        window.adpAppStore.defaultState(DEFAULT_STATE);

        $urlRouterProvider.otherwise(DEFAULT_STATE.url);
      } catch (e) {
        console.log('Menu item creation failed due to error: ', e)
      }

      try {
        AdpStateGeneratorProvider.createDashboards(MENU_ITEMS);
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
        console.log('Custom page creation failed due to error: ', e)
      }
    }

    return service;
  }
})();
