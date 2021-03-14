(function () {
  angular.module('app.adpFormActions', [])
    .factory('AdpFormActions', function (
      GraphqlCollectionMutator,
      AdpNotificationService,
      AdpFormDataUtils,
      ActionMessages,
      ACTIONS
    ) {
      return {
        submit: function (args, formHooks, cloneParams) {
          return callSubmit(args, cloneParams)
            .then(function (respData) {
              formHooks.onComplete && formHooks.onComplete(args, respData);
              notifySuccess(args);

              return respData;
            });
        },

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
        }
      };

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
