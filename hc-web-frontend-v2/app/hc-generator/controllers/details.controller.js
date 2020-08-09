;(function () {
  "use strict";

  angular
    .module('app.hcGenerator')
    .controller('DetailsController', DetailsController);

  /** @ngInject */
  function DetailsController(
    $state,
    HcDataService,
    HcNotificationService,
    HcSchemaService
  ) {
    var vm = this;
    vm.pageParams = HcSchemaService.getPageParams();
    vm.schema = HcSchemaService.getCurrentSchema();
    vm.fields = vm.schema.fields;
    vm.editMode = false;
    vm.loading = true;
    vm.recordId = $state.params.id;

    function getPageData() {
      // return HcDataService.get()
      return HcDataService.getSingleRecordData(vm.pageParams.link, vm.recordId)
        .then(function (response) {
          vm.pageData = response.data.data;
          vm.isNewRecord = _.isEmpty(vm.pageData);
          vm.isEmpty = _.isEmpty(vm.pageData);
          vm.loading = false;
        });
    }
    getPageData();
  }
})();
