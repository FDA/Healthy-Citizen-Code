;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .component('adpPasswordModal', {
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-password/adp-password-modal.html',
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
          vm.passwordField = vm.resolve.options.field;
          vm.args = AdpAuthSchemas.passwordUpdateArgs();
        };

        vm.onCancel = function () {
          return vm.dismiss({ $value: 'cancel' });
        };

        vm.formOptions = {
          localActionsStrategy: {
            submit: function (args) {
              return $q.resolve()
                .then(function () {
                  vm.close({ $value: args.row[vm.passwordField.fieldName] });
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
