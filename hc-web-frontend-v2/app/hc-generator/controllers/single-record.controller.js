;(function () {
  "use strict";

  angular
    .module('app.hcGenerator')
    .controller('SingleRecordController', SingleRecordController);

  /** @ngInject */
  function SingleRecordController(
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

    function getPageData() {
      return HcDataService.getSingleRecordData(vm.pageParams.link)
        .then(function (response) {
          vm.pageData = response.data.data;
          vm.isNewRecord = _.isEmpty(vm.pageData);
          vm.isEmpty = _.isEmpty(vm.pageData);
          vm.loading = false;
        });
    }
    getPageData();

    vm.submit = function (formData) {
      var action = vm.isNewRecord ? HcDataService.createRecord : HcDataService.updateRecord;
      var id = hasParent() ? vm.pageData['_id'] : undefined;

      return action(vm.pageParams.link, formData, id)
        .then(getPageData)
        .then(vm.cancelEditMode)
        .then(onSuccess);
    };

    function onSuccess() {
      var message = vm.isNewRecord ? ' successfully added.' : ' successfully updated.';

      HcNotificationService.notifySuccess(vm.schema.fullName + message);
    }

    function hasParent() {
      return vm.pageParams.link.split('/').length > 2;
    }

    vm.enterEditMode = function () {
      vm.editData = _.clone(vm.pageData);
      vm.editMode = true;
    };

    vm.cancelEditMode = function () {
      vm.editData = null;
      vm.editMode = false;
      return;
    }
  }
})();
