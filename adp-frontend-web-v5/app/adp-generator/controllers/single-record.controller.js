;(function () {
  "use strict";

  angular
    .module('app.adpGenerator')
    .controller('SingleRecordController', SingleRecordController);

  /** @ngInject */
  function SingleRecordController(
    AdpNotificationService,
    AdpSchemaService,
    ACTIONS,
    $state,
    $location,
    AdpQueryParams,
    GraphqlCollectionQuery,
    GraphqlCollectionMutator,
    ResponseError
  ) {
    var vm = this;
    (function init() {
      vm.schema = AdpSchemaService.getCurrentSchema();
      vm.formParams = _.get(vm.schema, 'parameters', {});
      vm.ACTIONS = ACTIONS;

      vm.editing = false;
      vm.loading = true;

      setSubmitAction();
      setTemplateMethods();
      getPageData()
        .then(callActionFromQuery)
    })();

    function setSubmitAction() {
      vm.submit = function (formData) {
        return GraphqlCollectionMutator[vm.currentAction](vm.schema, formData)
          .then(showUpdateNotification)
          .then(getPageData)
          .then(vm.cancelEditMode);
      };
    }

    function showUpdateNotification() {
      var message = getUpdateMessage(vm.schema.fullName, vm.currentAction);
      AdpNotificationService.notifySuccess(message);
    }

    function getUpdateMessage(fullName, actionName) {
      var messages = {};
      messages[ACTIONS.CREATE] = ' successfully added.';
      messages[ACTIONS.UPDATE] = ' successfully updated.';

      return fullName + messages[actionName];
    }

    function getPageData() {
      return GraphqlCollectionQuery(vm.schema)
        .then(function (data) {
          return data.items[0] || {};
        })
        .then(updatePageParams)
        .catch(function (error) {
          ErrorHelpers.handleError(error, 'Unknown error trying to data for query params');
        });
    }

    function updatePageParams(data) {
      updateFormParams(data);
      vm.pageData = data;
      vm.loading = false;
    }

    function updateFormParams(data) {
      vm.currentAction = _.isEmpty(data) ? ACTIONS.CREATE : ACTIONS.UPDATE;
      vm.formParams.actionType = vm.currentAction;
    }

    function setTemplateMethods() {
      vm.enterEditMode = function () {
        vm.editData = _.cloneDeep(vm.pageData);
        vm.editing = true;
      };

      vm.cancelEditMode = function () {
        vm.editData = null;
        vm.editing = false;
      };

      vm.showButton = function(actionToShow) {
        var hasPermission = _.hasIn(vm.schema, 'actions.fields.' + actionToShow);

        if (!hasPermission || vm.editing) {
          return false;
        }

        return vm.currentAction === actionToShow;
      };
    }

    function callActionFromQuery() {
      var actionFromQuery = $state.params.action;
      if (!actionPermitted(actionFromQuery, vm.schema)) {
        return;
      }

      callAction(actionFromQuery, vm.schema);
    }

    function actionPermitted(name, schema) {
      var pageActions = [ACTIONS.UPDATE, ACTIONS.CREATE];
      var permittedActions = schema.actions.fields || {};

      return pageActions.includes(name) && !!permittedActions[name];
    }

    function callAction(name, schema) {
      var dataFromQuery = AdpQueryParams.getDataFromQueryParams(schema, $location.search());
      vm.editData = _.merge({}, vm.pageData, dataFromQuery);
      vm.editing = true;
    }
  }
})();
