;(function () {
  "use strict";

  angular
    .module('app.adpProfile', [])
    .controller('ProfileController', ProfileController);

  /** @ngInject */
  function ProfileController(
    ACTIONS,
    GraphqlCollectionQuery,
    ErrorHelpers,
    AdpUnifiedArgs,
    $rootScope
  ) {
    var vm = this;
    vm.formOptions = {
      schemaActionsStrategy: {
        onComplete: afterFormUpdate,
        onCancel: afterFormUpdate,
      },
      disableFullscreen: true,
    };

    vm.editing = false;
    vm.loading = true;

    (function init() {
      setTemplateMethods();

      vm.userSchema = getUserSchema();
      vm.userID = lsService.getUser().id;

      getPageData(vm.userID, vm.userSchema);
    })();

    function getUserSchema() {
      var APP_MODEL = window.adpAppStore.appModel();
      return _.clone(_.get(APP_MODEL, 'users'));
    }

    function afterFormUpdate() {
      getPageData(vm.userID, vm.userSchema)
        .then(updateAvatar)
        .then(vm.cancelEditMode);
    }

    function getPageData(userID, schema) {
      return GraphqlCollectionQuery(schema, { filter: ['_id', '=', userID] })
        .then(function (data) {
          return _.get(data, 'items[0]', {});
        })
        .then(updatePageParams)
        .catch(function (error) {
          ErrorHelpers.handleError(error, 'Unknown error trying to data for query params');
        });
    }

    function updatePageParams(data) {
      vm.formParams = _.get(vm.userSchema, 'parameters', {});
      vm.args = getArgs(data);
      vm.loading = false;

      return data;
    }

    function updateAvatar(data) {
      var avatar = _.get(data, 'avatar.0', {});
      var user = lsService.getUser();
      var newUser = _.assign({}, user, { avatar: avatar });
      lsService.setUser(newUser);

      _.set($rootScope, 'avatar', avatar);
    }

    function getArgs(data) {
      return AdpUnifiedArgs.getHelperParamsWithConfig({
        path: '',
        action: ACTIONS.UPDATE,
        formData: data || {},
        schema: vm.userSchema,
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
  }
})();
