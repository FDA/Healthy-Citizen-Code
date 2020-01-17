;(function() {
  'use strict';

  angular
    .module('app.adpGenerator')
    .factory('AdpPageActions', AdpPageActions);

  /** @ngInject */
  function AdpPageActions(
    AdpSchemaService,
    AdpDataService,
    AdpNotificationService,
    AdpGeneratorModalService,
    AdpModalService
  ) {
    function execWithQueryFromQuery(
      dataFromQueryParams,
      actions,
      pageData
    ) {
      var actionName = dataFromQueryParams.action;
      var pageAction = actions[actionName];
      var schema = AdpSchemaService.getCurrentSchema();

      if (!pageAction) {
        return;
      }

      var createFn = function () {
        var createAllowed = !!schema.actions.fields.create;
        // fall silently
        if (!createAllowed) {
          return;
        }

        pageAction();
      };

      var otherAction = function () {
        var id = dataFromQueryParams['_id'];
        // fail silently
        if (!id) {
          return;
        }

        var data = _.find(pageData, function (d) {
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
      var pageParams = AdpSchemaService.getPageParams();
      var schema = AdpSchemaService.getCurrentSchema();

      return AdpDataService.getData(pageParams, schema);
    }

    function getActionsWithMessages(onUpdate) {
      return {
        'update': function (data, formOptions) {
          return updateRecord(data, formOptions)
            .then(_onSuccess)
            .then(onUpdate);
        },
        'delete': function (data, formOptions) {
          return deleteRecord(data, formOptions)
            .then(onUpdate);
        },
        'clone': function (data, formOptions) {
          return cloneRecord(data, formOptions)
            .then(_onSuccess)
            .then(onUpdate)
        },
        'create': function () {
          createRecord()
            .then(_onSuccess)
            .then(onUpdate)
        },
        'viewDetails': viewDetails
      }
    }

    function getRawActions() {
      return {
        'update': updateRecord,
        'delete': deleteRecord,
        'clone': cloneRecord,
        'create': createRecord,
        'viewDetails': viewDetails
      };
    }

    function _onSuccess(modalReturnValue) {
      var options = modalReturnValue.options;

      return getPageData()
        .then(function (data) {
          showMessage(options);
          return data;
        });
    }

    function createRecord(formOptions) {
      var options = setOptions('create', {}, formOptions);
      return callRecordModal(options);
    }

    function cloneRecord(data) {
      var options = setOptions('clone', data, formOptions);
      return callRecordModal(options);
    }

    function updateRecord(data, formOptions) {
      var options = setOptions('update', data, formOptions);
      return callRecordModal(options);
    }

    function deleteRecord(data) {
      var pageParams = AdpSchemaService.getPageParams();

      var options = {
        message: 'Are you sure that you want to delete this record?',
        actionType: 'delete'
      };

      return AdpModalService.confirm(options)
        .then(function () {
          return AdpDataService.deleteRecord(pageParams.link, data._id);
        })
        .then(getPageData)
        .then(function (data) {
          showDeleteMessage();
          return data;
        });
    }

    function viewDetails(itemData) {
      var schema = AdpSchemaService.getCurrentSchema();
      var options = {
        schema: schema,
        itemData: itemData
      };

      AdpGeneratorModalService.detailsModal(options);
    }

    function showMessage(options) {
      var $action = options.formParams.actionType;
      var isNewRecord = $action === 'create' || $action === 'clone';
      var message = isNewRecord ? ' successfully added.' : ' successfully updated.';
      var schema = AdpSchemaService.getCurrentSchema();

      AdpNotificationService.notifySuccess(schema.fullName + message);
    }

    function showDeleteMessage() {
      var schema = AdpSchemaService.getCurrentSchema();
      AdpNotificationService.notifySuccess(schema.fullName + ' successfully deleted.');
    }

    function callRecordModal(options) {
      return AdpGeneratorModalService.formModal(options);
    }

    function setOptions($action, data, formOptions) {
      var pageParams = AdpSchemaService.getPageParams();
      var schema = AdpSchemaService.getCurrentSchema();

      var formParams = _.assign({
          actionType: $action,
          btnText: formOptions && formOptions.btnText,
        },
        schema.parameters
      );

      var options = {
        schema: schema,
        fields: schema.fields,
        formParams: formParams,
        link: pageParams.link
      };

      if (!_.isUndefined(data)) {
        options.data = _.cloneDeep(data);
      }

      if ($action === 'clone') {
        delete options.data._id;
      }

      return options;
    }

    return {
      execWithQueryFromQuery: execWithQueryFromQuery,
      getActionsWithMessages: getActionsWithMessages,
      getRawActions: getRawActions,
      getPageData: getPageData,
    };
  }
})();
