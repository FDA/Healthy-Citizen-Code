;(function () {
  "use strict";

  angular
    .module('app.adpGenerator')
    .controller('MultiRecordController', MultiRecordController);

  /** @ngInject */
  function MultiRecordController(
    AdpDataService,
    AdpNotificationService,
    AdpGeneratorModalService,
    AdpModalService,
    AdpSchemaService,
    $state
  ) {
    var vm = this;
    vm.pageParams = AdpSchemaService.getPageParams();
    vm.schema = AdpSchemaService.getCurrentSchema();
    vm.actions = vm.schema.actions;
    vm.fields = vm.schema.fields;
    vm.showCreate = !!vm.actions.fields.create;

    vm.loading = true;
    vm.resourceUrl = AdpDataService.getResourceUrl(vm.pageParams.link);

    vm.actionCbs = {
      'update': updateRecord,
      'delete': deleteRecord,
      'viewDetails': viewDetails,
      'clone': cloneRecord,
      'create': createRecord
    };
    vm.create = createRecord;

    function execActionFromParams(params) {
      var actionName = params.action;
      var pageAction = vm.actionCbs[actionName];
      if (!pageAction) {
        return;
      }

      var createFn = function () {
        var createAllowed = !!vm.actions.fields.create;
        // fall silently
        if (!createAllowed) {
          return;
        }

        pageAction();
      };

      var otherAction = function () {
        var id = params['_id'];
        // fail silently
        if (!id) {
          return;
        }

        var data = _.find(vm.pageData, function (d) {
          return d['_id'] === id;
        });

        // fail silently
        if (!data) {
          return;
        }

        // check record permissions
        if (!data._actions[actionName]) {
          return;
        }

        pageAction(data);
      };

      if (actionName === 'create') {
        createFn()
      } else {
        otherAction();
      }
    }

    function getPageData() {
      return AdpDataService.getData(vm.pageParams, vm.schema)
        .then(function (data) {
          vm.pageData = data;
          execActionFromParams($state.params);
          vm.loading = false;
        });
    }
    getPageData();

    // Actions definition
    function createRecord() {
      var formParams = _.assign({}, vm.schema.parameters);
      formParams.actionType = 'create';

      var options = {
        schema: vm.schema,
        fields: vm.fields,
        formParams: formParams,
        link: vm.pageParams.link
      };

      AdpGeneratorModalService.formModal(options)
        .then(getPageData)
        .then(showMessage);
    }

    function cloneRecord(data) {
      var formParams = _.assign({}, vm.schema.parameters);
      formParams.actionType = 'clone';

      var options = {
        schema: vm.schema,
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
        schema: vm.schema,
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
