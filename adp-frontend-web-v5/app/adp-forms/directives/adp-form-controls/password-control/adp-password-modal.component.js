;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .component('adpPasswordModal', {
      templateUrl: 'app/adp-forms/directives/adp-form-controls/password-control/adp-password-modal.html',
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controller: function AdpRecordModalController(
        AdpUnifiedArgs,
        AdpAuthSchemas,
        $q
      ) {
        var vm = this;

        vm.$onInit = function () {
          vm.passwordArgs = vm.resolve.options.args;
          vm.args = AdpAuthSchemas.passwordUpdateArgs();

          vm.args.modelSchema.schemaName = [
            'updatePassword',
            vm.passwordArgs.modelSchema.schemaName,
            vm.passwordArgs.fieldSchema.fieldName,
          ].join('.');
        };

        vm.onCancel = function () {
          return vm.dismiss({ $value: 'cancel' });
        };

        vm.formOptions = {
          localActionsStrategy: {
            submit: function (args) {
              return $q.resolve()
                .then(function () {
                  vm.close({ $value: args.row[vm.passwordArgs.fieldSchema.fieldName] });
                  return args.row;
                });
            },
          },
          disableFullscreen: true,
        };
      },
      controllerAs: 'vm'
    });
})();
