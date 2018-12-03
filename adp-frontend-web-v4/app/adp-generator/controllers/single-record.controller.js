;(function () {
  "use strict";

  angular
    .module('app.adpGenerator')
    .controller('SingleRecordController', SingleRecordController);

  /** @ngInject */
  function SingleRecordController(
    AdpDataService,
    AdpNotificationService,
    AdpSchemaService,
    $q
  ) {
    var vm = this;
    vm.pageParams = AdpSchemaService.getPageParams();
    vm.schema = AdpSchemaService.getCurrentSchema();
    vm.formParams = vm.schema.parameters || {};
    vm.fields = vm.schema.fields;
    vm.editMode = false;
    vm.loading = true;
    vm.showCreate = !!vm.schema.actions.fields.create;

    function getPageData() {
      return AdpDataService.getSingleRecordData(vm.pageParams, vm.schema)
        .then(function (data) {
          vm.pageData = data;
          vm.isNewRecord = _.isEmpty(vm.pageData);
          vm.isEmpty = _.isEmpty(vm.pageData);

          vm.formParams.actionType = vm.isNewRecord ? 'create' : 'update';
          vm.loading = false;
        });
    }
    getPageData();

    vm.submit = function (formData) {
      var action = vm.isNewRecord ? AdpDataService.createRecord : AdpDataService.updateRecord;

      return action(vm.pageParams.link, formData, vm.pageData['_id'])
        .then(function (response) {
          if (response.data.success) {
            return response;
          } else {
            $q.reject();
          }
        })
        .then(getPageData)
        .then(vm.cancelEditMode)
        .then(onSuccess);
    };

    function onSuccess() {
      var message = vm.isNewRecord ? ' successfully added.' : ' successfully updated.';

      AdpNotificationService.notifySuccess(vm.schema.fullName + message);
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
