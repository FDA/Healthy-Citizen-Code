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
          return callSubmit.apply(args, arguments)
            .then(function () {
              formHooks.onComplete && formHooks.onComplete(args);
              notifySuccess(args);
            });
        },

        apply: function (args, cloneParams, onComplete) {
          return callSubmit.apply(args, arguments)
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
        var cleanedFormData = AdpFormDataUtils.transformDataBeforeSending(args.row, args.modelSchema);
        return GraphqlCollectionMutator[args.action](args.modelSchema, cleanedFormData, cloneParams);
      }

      function notifySuccess(args) {
        var message = ActionMessages[args.action](args.modelSchema);

        AdpNotificationService.notifySuccess(message);
      }
    });
})();
