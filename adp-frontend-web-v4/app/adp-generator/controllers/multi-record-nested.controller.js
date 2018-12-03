;(function () {
  "use strict";

  angular
    .module('app.adpGenerator')
    .controller('MultiRecordNestedController', MultiRecordNestedController);

  /** @ngInject */
  function MultiRecordNestedController(
    AdpDataService,
    AdpNotificationService,
    AdpGeneratorModalService,
    AdpModalService,
    $uibModalStack,
    AdpSchemaService,
    $state
  ) {
    var vm = this;
    vm.pageParams = AdpSchemaService.getPageParams();
    vm.schema = AdpSchemaService.getCurrentSchema();
    vm.fields = vm.schema.fields;
    vm.showCreate = !!vm.actions.fields.create;

    vm.parentSchema = AdpSchemaService.getParentSchema();
    vm.parentFields = vm.parentSchema.fields;

    vm.actionCbs = {
      'clone': cloneRecord,
      'update': updateRecord,
      'delete': deleteRecord,
      'viewDetails': viewDetails,
      'create': createRecord,
      'createParent': createParentRecord
    };

    vm.loading = true;
    vm.resourceUrl = AdpDataService.getResourceUrl(vm.pageParams.link);

    function getPageData() {
      return AdpDataService.getData(vm.pageParams.link)
        .then(setData)
        .then(createFields)
        .finally(function () {
          vm.loading = false;
        });
    }
    getPageData();

    function setData(response) {
      vm.parentData = response.data.data;
      vm.pageData = AdpDataService.getNestedData(vm.parentData, vm.pageParams.fieldName);
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
      var formParams = _.assign({}, vm.schema.parameters);
      formParams.actionType = 'create';

      var options = {
        fields: vm.fields,
        formParams: formParams,
        link: vm.pageParams.link
      };

      AdpGeneratorModalService.formModal(options)
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

      AdpGeneratorModalService.formModal(options)
        .then(getPageData)
        .then(createFields)
        .then(function () {
          return AdpNotificationService.notifySuccess(vm.parentSchema.fullName + ' successfully added.');
        })
        .then(vm.create);
    }

    function cloneRecord(data) {
      var formParams = _.assign({}, vm.schema.parameters);
      formParams.actionType = 'clone';

      var options = {
        fields: vm.fields,
        formParams: formParams,
        link: vm.pageParams.link
      };

      if (!_.isUndefined(data)) {
        options.data = _.cloneDeep(data);
        delete options.data._id;
      }

      AdpGeneratorModalService.formModal(options)
        .then(getPageData)
        .then(showMessage);
    }

    function updateRecord(data) {
      var formParams = _.assign({}, vm.schema.parameters);
      formParams.actionType = 'update';

      var options = {
        fields: vm.fields,
        formParams: formParams,
        link: vm.pageParams.link,
        data: _.cloneDeep(data),
        id: data._id
      };

      AdpGeneratorModalService.formModal(options)
        .then(getPageData)
        .then(showMessage);
    }

    function deleteRecord(data) {
      var options = {
        message: 'Are you sure that you want to delete this record?',
        actionType: 'delete'
      };

      AdpModalService.confirm(options)
        .then(function () {
          return AdpDataService.deleteRecord(vm.pageParams.link, data._id);
        })
        .then(getPageData)
        .then(showDeleteMessage);
    }

    function showMessage() {
      var message = vm.isNewRecord ? ' successfully added.' : ' successfully updated.';
      AdpNotificationService.notifySuccess(vm.schema.fullName + message);
    }

    function showDeleteMessage() {
      AdpNotificationService.notifySuccess(vm.schema.fullName + ' successfully deleted.');
    }

    function viewDetails(itemData) {
      var options = {
        schema: vm.schema,
        itemData: itemData
      };

      AdpGeneratorModalService.detailsModal(options);
    }
  }
})();
