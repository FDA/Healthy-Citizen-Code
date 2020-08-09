;(function () {
  "use strict";

  angular
    .module('app.hcGenerator')
    .controller('MultiRecordNestedController', MultiRecordNestedController);

  /** @ngInject */
  function MultiRecordNestedController(
    HcDataService,
    HcNotificationService,
    HcGeneratorModalService,
    HcModalService,
    $uibModalStack,
    HcSchemaService,
    $state
  ) {
    var vm = this;
    vm.pageParams = HcSchemaService.getPageParams();
    vm.schema = HcSchemaService.getCurrentSchema();
    vm.fields = vm.schema.fields;

    vm.parentSchema = HcSchemaService.getParentSchema();
    vm.parentFields = vm.parentSchema.fields;

    angular.extend(vm, {
      create: createRecord,
      update: updateRecord,
      'delete': deleteRecord,
      createParent: createParentRecord
    });

    vm.loading = true;
    vm.resourceUrl = HcDataService.getResourceUrl(vm.pageParams.link);

    function getPageData() {
      return HcDataService.getData(vm.pageParams.link)
        .then(setData)
        .then(createFields)
        .finally(function () {
          vm.loading = false;
        });
    }
    getPageData();

    if ($state.params.addRecord) {
      vm.create();
      $state.params.addRecord = null;
    }

    function setData(response) {
      vm.parentData = response.data.data;
      vm.pageData = HcDataService.getNestedData(vm.parentData, vm.pageParams.fieldName);
      return;
    }

    function createFields() {
      delete vm.schema.fields['_id'];

      vm.fields = {};
      vm.fields['parentId'] = {
        visible: true,
        fullName: 'Select parent ' + vm.parentSchema.fullName,
        buttonName: 'Create new ' + vm.parentSchema.fullName,
        description: 'Select parent ' + vm.parentSchema.fullName,
        labelRenderer: vm.parentSchema.labelRenderer,
        pageParams: vm.pageParams,
        required: true,
        type: 'ObjectID',
        parentData: createParentList(vm.parentData)
      };

      vm.fields = _.extend(vm.fields, vm.schema.fields);

      return;
    }

    function createParentList(parentData) {
      return parentData.map(function (data) {
        return {
          value: data._id,
          label: appModelHelpers.LabelRenderers[vm.parentSchema.labelRenderer](data)
        }
      });
    }

    function createRecord() {
      var options = {
        actionType: 'create',
        fields: vm.fields,
        pageParams: vm.pageParams,
        createParentCallback: vm.createParent
      };

      HcGeneratorModalService.formNestedModal(options)
        .then(getPageData)
        .then(showMessage);
    }

    function createParentRecord() {
      $uibModalStack.dismissAll();

      var options = {
        actionType: 'create',
        fields: vm.parentFields,
        link: vm.pageParams.link
      };

      HcGeneratorModalService.formModal(options)
        .then(getPageData)
        .then(createFields)
        .then(function () {
          return HcNotificationService.notifySuccess(vm.parentSchema.fullName + ' successfully added.');
        })
        .then(vm.create);
    };

    function updateRecord(data) {
      var options = {
        actionType: 'update',
        fields: vm.fields,
        pageParams: vm.pageParams,
        data: _.clone(data)
      };

      HcGeneratorModalService.formNestedModal(options)
        .then(getPageData)
        .then(showMessage);
    }

    function deleteRecord(data) {
      var options = {
        message: 'Are you sure that you want to delete this record?'
      };

      var parent = _.find(vm.parentData, function (record) {
        return _.find(record[vm.pageParams.fieldName], ['_id', data._id]);
      });

      HcModalService.confirm(options)
        .then(function () {
          return HcDataService.deleteNestedRecord(vm.pageParams.link, parent['_id'], vm.pageParams.fieldName, data._id);
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
