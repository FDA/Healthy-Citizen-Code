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
        AdpAuthSchemas,
        $q
      ) {
        var vm = this;

        vm.$onInit = function () {
          vm.field = vm.resolve.options.field;
          vm.schema = AdpAuthSchemas.reset(vm.field);
          vm.fields = vm.schema.fields;

          vm.data = {};
        };

        vm.cancel = function () {
          vm.dismiss({$value: 'cancel'});
        };

        vm.submit = function (formData) {
          return $q.resolve()
            .then(function () {
              vm.close({ $value: formData[vm.field.fieldName] });
            });
        };
      },
      controllerAs: 'vm'
    });
})();
