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
          vm.loading = false;
        });
    }
    getPageData()
      .then(function () {
        execActionFromParams($state.params);
      });

    // Actions definition
    function createRecord() {
      var options = setOptions('create');
      callRecordModal(options);
    }

    function cloneRecord(data) {
      var options = setOptions('clone', data);
      callRecordModal(options);
    }

    function updateRecord(data) {
      var options = setOptions('update', data);
      callRecordModal(options);
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

    function viewDetails(itemData) {
      var options = {
        schema: vm.schema,
        itemData: itemData
      };

      AdpGeneratorModalService.detailsModal(options);
    }

    function showMessage(options) {
      var $action = options.formParams.actionType;
      var isNewRecord = $action === 'create' || $action === 'clone';
      var message = isNewRecord ? ' successfully added.' : ' successfully updated.';

      AdpNotificationService.notifySuccess(vm.schema.fullName + message);
    }

    function showDeleteMessage() {
      AdpNotificationService.notifySuccess(vm.schema.fullName + ' successfully deleted.');
    }

    function callRecordModal(options) {
      AdpGeneratorModalService.formModal(options)
        .then(getPageData)
        .then(function () {
          showMessage(options);
        });
    }

    function setOptions($action, data) {
      var formParams = _.assign({ actionType: $action }, vm.schema.parameters);

      var options = {
        schema: vm.schema,
        fields: vm.fields,
        formParams: formParams,
        link: vm.pageParams.link
      };

      if (!_.isUndefined(data)) {
        options.data = _.cloneDeep(data);
      }

      if ($action === 'clone') {
        delete options.data._id;
      }

      return options;
    }
  }
})();
