;(function () {
  "use strict";

  angular
    .module('app.adpGenerator')
    .controller('DashboardController', DashboardController);

  /** @ngInject */
  function DashboardController(AdpSchemaService) {
    var vm = this;
    vm.pageParams = AdpSchemaService.getPageParams();
  }
})();
