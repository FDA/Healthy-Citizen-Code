;(function () {
  "use strict";

  angular
    .module('app.adpGenerator')
    .controller('SingleRecordController', SingleRecordController);

  /** @ngInject */
  function SingleRecordController(
    AdpSchemaService,
    ACTIONS,
    $state,
    $location,
    AdpQueryParams,
    GraphqlCollectionQuery,
    ErrorHelpers,
    AdpUnifiedArgs
  ) {
    var vm = this;
    (function init() {
      vm.ACTIONS = ACTIONS;

      vm.editing = false;
      vm.loading = true;

      setTemplateMethods();

      getPageData(AdpSchemaService.getCurrentSchema())
        .then(callActionFromQuery)
    })();

    vm.formOptions = {
      schemaActionsStrategy: {
        onComplete: afterFormUpdate,
        onCancel: afterFormUpdate,
      },
      disableFullscreen: true,
    };

    function afterFormUpdate() {
      getPageData(vm.args.modelSchema)
        .then(vm.cancelEditMode);
    }

    function getPageData(schema) {
      return GraphqlCollectionQuery(schema)
        .then(function (data) {
          return data.items[0] || {};
        })
        .then(updatePageParams)
        .catch(function (error) {
          ErrorHelpers.handleError(error, 'Unknown error trying to data for query params');
        });
    }

    function updatePageParams(data) {
      vm.formParams = _.get(vm.schema, 'parameters', {});

      var action = _.isEmpty(data) ? ACTIONS.CREATE : ACTIONS.UPDATE;
      vm.args = getArgs(data, action);

      vm.loading = false;
    }

    function getArgs(data, action) {
      return AdpUnifiedArgs.getHelperParamsWithConfig({
        path: '',
        action: action,
        formData: data || {},
        schema: _.cloneDeep(AdpSchemaService.getCurrentSchema()),
      });
    }

    function setTemplateMethods() {
      vm.enterEditMode = function () {
        vm.editArgs = _.cloneDeep(vm.args);
        vm.editing = true;
      };

      vm.cancelEditMode = function () {
        vm.editArgs = null;
        vm.editing = false;
      };

      vm.showButton = function(actionToShow) {
        var hasPermission = _.hasIn(vm.args.modelSchema, 'actions.fields.' + actionToShow);
        if (!hasPermission) {
          return false;
        }

        return vm.args.action === actionToShow;
      };
    }

    function callActionFromQuery() {
      var actionFromQuery = $state.params.action;
      if (!actionPermitted(actionFromQuery, vm.args.modelSchema)) {
        return;
      }

      callAction(actionFromQuery, vm.args.modelSchema);
    }

    function actionPermitted(name, schema) {
      var pageActions = [ACTIONS.UPDATE, ACTIONS.CREATE];
      var permittedActions = schema.actions.fields || {};

      return pageActions.includes(name) && !!permittedActions[name];
    }

    function callAction(name, schema) {
      var dataFromQuery = AdpQueryParams.getDataFromQueryParams(schema, $location.search());
      vm.editArgs = _.merge({}, vm.args, { row: dataFromQuery });
      vm.editing = true;
    }
  }
})();
