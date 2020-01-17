;(function () {
  "use strict";

  angular
    .module('app.adpGenerator')
    .controller('MultiRecordController', MultiRecordController);

  /** @ngInject */
  function MultiRecordController(
    AdpDataService,
    AdpSchemaService,
    $state,
    AdpPageActions
  ) {
    var vm = this;
    vm.pageParams = AdpSchemaService.getPageParams();
    vm.resourceUrl = AdpDataService.getResourceUrl(vm.pageParams.link);

    vm.schema = AdpSchemaService.getCurrentSchema();
    vm.loading = true;
    vm.pageData = [];

    vm.showCreate = (function createIsPermitted() {
      return _.hasIn(vm.schema, 'actions.fields.create');
    })();

    var updatePageCb = function(data) {
      vm.pageData = data;
    };
    vm.actionCbs = AdpPageActions.getActionsWithMessages(updatePageCb);
    vm.create = vm.actionCbs['create'];

    AdpPageActions.getPageData()
      .then(function (data) {
        AdpPageActions.execWithQueryFromQuery($state.params, vm.actionCbs, data);
        vm.pageData = data;
        vm.loading = false;
      });
  }
})();
