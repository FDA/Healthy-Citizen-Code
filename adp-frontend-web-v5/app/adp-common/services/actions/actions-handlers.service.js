;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .factory('ActionsHandlers', ActionsHandlers);

  /** @ngInject */
  function ActionsHandlers(
    AdpGeneratorModalService,
    AdpNotificationService,
    AdpModalService,
    ACTIONS,
    ActionMessages,
    GraphqlCollectionMutator
  ) {
    return {
      create: createAction,
      print: printAction,
      update: updateAction,
      viewDetails: viewDetails,
      delete: deleteRecord,
      clone: cloneAction,
    };

    function createAction(schema, data) {
      var modalOptions = getActionsOptions(ACTIONS.CREATE, schema, data);
      return showFormModal(modalOptions);
    }

    function printAction(schema) {
      // doing noop, not ready
    }

    function updateAction(schema, data) {
      var modalOptions = getActionsOptions(ACTIONS.UPDATE, schema, data);
      return showFormModal(modalOptions);
    }

    function cloneAction(schema, data) {
      var clonedData = _.cloneDeep(data);
      delete clonedData._id;
      delete clonedData._actions;

      var modalOptions = getActionsOptions(ACTIONS.CLONE, schema, clonedData);
      return showFormModal(modalOptions);
    }

    function deleteRecord(schema, data) {
      var modalOptions = {
        message: 'Are you sure that you want to delete this record?',
        schema: schema,
        formParams: { actionType: ACTIONS.DELETE },
      };

      return AdpModalService.confirm(modalOptions)
        .then(function () {
          return GraphqlCollectionMutator.delete(schema, data);
        })
        .then(function () {
          showMessage(modalOptions);
        })
        .catch(function (error) {
          ErrorHelpers.handleError(error, 'Unknown error, while trying to delete record.');
        });
    }

    function viewDetails(schema, data) {
      var options = {
        schema: schema,
        data: data
      };

      return AdpGeneratorModalService.detailsModal(options);
    }

    function getActionsOptions($action, schema, data) {
      var formParams = _.assign(
        {
          actionType: $action,
          btnText: selectBtnText($action),
        },
        schema.parameters
      );

      return {
        actionCb: GraphqlCollectionMutator[$action],
        schema: schema,
        formParams: formParams,
        data: _.isNil(data) ? {} : data,
      };
    }

    function selectBtnText(action) {
      var texts = {};
      texts[ACTIONS.CREATE] = 'Add';
      texts[ACTIONS.CLONE] = 'Add';
      texts[ACTIONS.UPDATE] = 'Update';

      return texts[action];
    }

    function showFormModal(modalOptions) {
      return AdpGeneratorModalService.formModal(modalOptions)
        .then(function () {
          showMessage(modalOptions);
        });
    }

    function showMessage(options) {
      var actionName = options.formParams.actionType;
      var schema = options.schema;
      var message = ActionMessages[actionName](schema);

      AdpNotificationService.notifySuccess(message);
    }
  }
})();
