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
    GraphqlCollectionMutator,
    ErrorHelpers,
    AdpUnifiedArgs
  ) {
    return {
      create: createAction,
      update: updateAction,
      viewDetails: viewDetails,
      delete: deleteRecord,
      clone: cloneAction,
    };

    function createAction(schema, data) {
      var modalOptions = getActionsOptions(ACTIONS.CREATE, schema, data);
      return showFormModal(modalOptions);
    }

    function updateAction(schema, data) {
      var modalOptions = getActionsOptions(ACTIONS.UPDATE, schema, data);
      return showFormModal(modalOptions);
    }

    function cloneAction(schema, data) {
      var modalOptions = cloneOptions(schema, data);

      if (schema.schemaName === 'datasets') {
        modalOptions.cloneParams = {
          parentCollectionName: data.collectionName,
          projections: Object.keys(data.scheme.fields),
        };
      }

      return showFormModal(modalOptions);
    }

    function cloneOptions(schema, data) {
      var clonedData = _.cloneDeep(data);
      delete clonedData._id;
      delete clonedData._actions;

      return getActionsOptions(ACTIONS.CLONE, schema, clonedData);
    }

    function deleteRecord(schema, data) {
      var modalOptions = {
        message: 'Are you sure that you want to delete this record?',
        schema: schema,
        actionType: ACTIONS.DELETE,
      };

      return AdpModalService.confirm(modalOptions)
        .then(function () {
          return GraphqlCollectionMutator.delete(schema, data);
        })
        .then(function () {
          AdpNotificationService.notifySuccess(ActionMessages[ACTIONS.DELETE](schema));
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
      var args = AdpUnifiedArgs.getHelperParamsWithConfig({
        path: '',
        action: $action,
        formData: data || {},
        schema: schema,
      });

      if ($action === ACTIONS.CLONE && schema.schemaName === 'datasets') {
        args.action = ACTIONS.CLONE_DATASET;
      }

      return { args: args };
    }

    function showFormModal(modalOptions) {
      return AdpGeneratorModalService.formModal(modalOptions);
    }
  }
})();
