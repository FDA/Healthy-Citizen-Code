;(function () {
  'use strict';

angular
  .module('app.adpGenerator', [
    'ui.router',
    'app.adpAuth',
    'app.adpDashboard'
  ])
  .run(onRun)
  .config(onConfig);

  function onRun($rootScope, $location, $state, DEFAULT_STATE) {
    // TODO: this temp fix. For some reason current versino of ui-router doesn't recognize url wih missing params
    // TODO: such as /phis//personal-health-data. We nee to fix it later, probably update ui router with stabel 1+ version
    $rootScope.$on("$locationChangeStart", function() {
      if ((/[/]{2,}/g).test($location.url())) {
        $state.go(DEFAULT_STATE.stateName);
      }
    });
  }

  function onConfig (
    AdpMenuGeneratorProvider,
    AdpStateGeneratorProvider,
    $urlRouterProvider,
    $provide,
    INTERFACE,
    SCHEMAS
  ) {
    var MENU_ITEMS, DEFAULT_STATE, DASHBOARD;

    try {
      MENU_ITEMS = AdpMenuGeneratorProvider.createMenuItems(INTERFACE.mainMenu);
      $provide.constant('MENU_ITEMS', MENU_ITEMS);
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
      $provide.constant('DEFAULT_STATE', DEFAULT_STATE);
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
      AdpStateGeneratorProvider.createStates(SCHEMAS, INTERFACE);
    } catch (e) {
      console.log('Custom page creation failed due to error: ', e)
    }
  }
})();
