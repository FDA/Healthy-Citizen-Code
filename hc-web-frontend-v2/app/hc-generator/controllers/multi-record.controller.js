;(function () {
  "use strict";

  angular
    .module('app.hcGenerator')
    .controller('MultiRecordController', MultiRecordController);

  /** @ngInject */
  function MultiRecordController(
    HcDataService,
    HcNotificationService,
    HcGeneratorModalService,
    HcModalService,
    HcSchemaService,
    $state
  ) {
    var vm = this;
    vm.pageParams = HcSchemaService.getPageParams();
    vm.schema = HcSchemaService.getCurrentSchema();
    vm.fields = vm.schema.fields;
    vm.loading = true;

    vm.resourceUrl = HcDataService.getResourceUrl(vm.pageParams.link);

    vm.hasDetails = vm.pageParams.hasDetails;

    angular.extend(vm, {
      create: createRecord,
      update: updateRecord,
      'delete': deleteRecord
    });

    function getPageData() {
      return HcDataService.getData(vm.pageParams.link)
        .then(function (response) {
          vm.pageData = response.data.data;
          vm.loading = false;
        });
    }
    getPageData();

    // Check state param addRecord, open add popup if true
    if ($state.params.addRecord) {
      vm.create();
      $state.params.addRecord = null;
    }

    // Actions definition
    function createRecord() {
      var options = {
        actionType: 'create',
        fields: vm.fields,
        link: vm.pageParams.link
      };

      HcGeneratorModalService.formModal(options)
        .then(getPageData)
        .then(showMessage);
    }

    function updateRecord(data) {
      var options = {
        actionType: 'update',
        fields: vm.fields,
        link: vm.pageParams.link,
        data: _.clone(data),
        id: data._id
      };

      HcGeneratorModalService.formModal(options)
        .then(getPageData)
        .then(showMessage);
    }

    function deleteRecord(data) {
      var options = {
        message: 'Are you sure that you want to delete this record?'
      };

      HcModalService.confirm(options)
        .then(function () {
          return HcDataService.deleteRecord(vm.pageParams.link, data._id);
        })
        .then(getPageData)
        .then(showDeleteMessage);
    }

    function showMessage() {
      var message = vm.isNewRecord ? ' successfully added.' : ' successfully updated.';
      HcNotificationService.notifySuccess(vm.schema.fullName + message);
    }

    function showDeleteMessage() {
      HcNotificationService.notifySuccess(vm.schema.fullName + ' successfully deleted.');
    }
  }
})();
