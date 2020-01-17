;(function () {
  "use strict";

  angular
    .module('app.adpGenerator')
    .controller('MultiRecordController', MultiRecordController);

  /** @ngInject */
  function MultiRecordController(
    MultiRecordPageService,
    AdpSchemaService,
    $location
  ) {
    var vm = this;
    vm.schema = AdpSchemaService.getCurrentSchema();
    MultiRecordPageService(vm.schema, $location.search());
  }
})();
