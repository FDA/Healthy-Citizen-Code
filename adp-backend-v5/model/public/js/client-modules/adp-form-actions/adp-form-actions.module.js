(function () {
  angular.module('app.adpFormActions', [])
    .factory('AdpFormActions', function (
      GraphqlCollectionMutator,
      AdpNotificationService,
      AdpFormDataUtils,
      ActionMessages,
      $timeout,
      AdpMenuService,
      ACTIONS
    ) {
      return {
        submit: doSubmit,

        apply: function (args, formHooks, cloneParams) {
          return callSubmit(args, cloneParams)
            .then(function (responseData) {
              notifySuccess(args);

              var shouldChangeActionToUpdate = _.includes([ACTIONS.CREATE, ACTIONS.CLONE, ACTIONS.CLONE_DATASET], args.action);
              if (shouldChangeActionToUpdate) {
                args.row._id = responseData._id;
                args.action = ACTIONS.UPDATE;
              }
            });
        },

        cancel: function (args, formHooks) {
          formHooks.onCancel && formHooks.onCancel(args);
        },

        submitAndReload: function (args, formHooks, cloneParams) {
          return doSubmit(args, formHooks, cloneParams)
            .then(function (respData) {
              AdpNotificationService.notifySuccess('Reloading page');
              $timeout(function () {
                window.location.reload()
              }, 1000);

              return respData;
            });
        },

        datasetsSubmitAndUpdateMenu: function(args, formHooks, cloneParams) {
          return doSubmit(args, formHooks, cloneParams)
            .then(function (respData) {
              var cur = args.row;
              var prev = args.parentData;
              var toUpdateMenu = (cur.favorite && prev.name !== cur.name) || (cur.favorite !== prev.favorite)

              if (toUpdateMenu) {
                AdpMenuService.generateMenu();
              }

              return respData;
            });
        },
      };

      function doSubmit(args, formHooks, cloneParams) {
        return callSubmit(args, cloneParams)
          .then(function (respData) {
            formHooks.onComplete && formHooks.onComplete(args, respData);
            notifySuccess(args);

            return respData;
          });
      }

      function callSubmit(args, cloneParams) {
        var argsWithCleanedRow = AdpFormDataUtils.transformDataBeforeSending(args);
        return GraphqlCollectionMutator[args.action](args.modelSchema, argsWithCleanedRow.row, cloneParams);
      }

      function notifySuccess(args) {
        var message = ActionMessages[args.action](args.modelSchema);

        AdpNotificationService.notifySuccess(message);
      }
    });
})();
