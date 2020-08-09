;(function () {
  'use strict';

angular
  .module('app.hcGenerator', [
    'ui.router',
    'app.hcAuth',
    'app.hcTables',
    'app.hcDashboard'
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
    HcRoutingGeneratorProvider,
    HcStateProvider,
    $urlRouterProvider,
    $provide,
    INTERFACE,
    SCHEMAS
  ) {
    var MENU_ITEMS = HcRoutingGeneratorProvider.createMenuItems(INTERFACE.main_menu);
    var DEFAULT_STATE = HcRoutingGeneratorProvider.getDefaultStateParams(INTERFACE.main_menu);

    $provide.constant('MENU_ITEMS', MENU_ITEMS);
    $provide.constant('DEFAULT_STATE', DEFAULT_STATE);


    HcStateProvider.createCustomPages(INTERFACE);
    HcStateProvider.createDashboards(MENU_ITEMS);
    HcStateProvider.createRoutes(SCHEMAS, INTERFACE);

    $urlRouterProvider.otherwise(DEFAULT_STATE.url);
    $urlRouterProvider.when('/phis//personal-health-data', function () {
      return DEFAULT_STATE.url;
    });
  }
})();
