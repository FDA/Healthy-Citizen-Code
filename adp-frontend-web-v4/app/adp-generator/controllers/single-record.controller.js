;(function () {
  "use strict";

  angular
    .module('app.adpGenerator')
    .controller('SingleRecordController', SingleRecordController);

  /** @ngInject */
  function SingleRecordController(
    AdpDataService,
    AdpNotificationService,
    AdpSchemaService
  ) {
    var vm = this;
    vm.pageParams = AdpSchemaService.getPageParams();
    vm.schema = AdpSchemaService.getCurrentSchema();
    vm.formParams = vm.schema.parameters || {};
    vm.fields = vm.schema.fields;

    vm.editing = false;
    vm.loading = true;

    AdpDataService.getSingleRecordData(vm.pageParams, vm.schema)
      .then(updateStateParams);

    function updateStateParams(data) {
      vm.pageData = data;
      vm.isEmpty = _.isEmpty(vm.pageData);

      vm.formParams.actionType = vm.isEmpty ? 'create' : 'update';
      vm.loading = false;
    }

    vm.submit = function (formData) {
      var actionName = vm.isEmpty ? 'createRecord' : 'updateRecord';

      return AdpDataService[actionName](vm.pageParams.link, formData)
        .then(function () {
          return AdpDataService.getSingleRecordData(vm.pageParams, vm.schema);
        })
        .then(function (data) {
          onSuccess();
          return data;
        })
        .then(updateStateParams)
        .then(vm.cancelEditMode);
    };

    function onSuccess() {
      var $action = vm.formParams.actionType;
      var message = $action === 'create' ? ' successfully added.' : ' successfully updated.';

      AdpNotificationService.notifySuccess(vm.schema.fullName + message);
    }

    vm.enterEditMode = function () {
      vm.editData = _.clone(vm.pageData);
      vm.editing = true;
    };

    vm.cancelEditMode = function () {
      vm.editData = null;
      vm.editing = false;
    };

    vm.showButton = function(action) {
      var $action = vm.formParams.actionType;
      var hasPermission = _.hasIn(vm.schema, 'actions.fields.' + action);

      if (!hasPermission || vm.editing) {
        return false;
      }

      return $action === action;
    };
  }
})();
