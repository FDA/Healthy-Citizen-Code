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
      controller: function AdpRecordModalController($q, AdpSchemaService) {
        var vm = this;

        vm.$onInit = function () {
          vm.schema = AdpSchemaService.getPasswordSchema(vm.resolve.options.field);
          vm.fields = vm.schema.fields;

          vm.data = {};
        };

        vm.cancel = function () {
          vm.dismiss({$value: 'cancel'});
        };

        vm.submit = function () {
          return $q.resolve()
            .then(function () {
              vm.close({$value: vm.data});
            });
        };
      },
      controllerAs: 'vm'
    });
})();