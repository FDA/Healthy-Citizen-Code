;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .component('adpPromptDialogModal', {
      templateUrl: 'app/adp-common/directives/adp-prompt-dialog-modal/adp-prompt-dialog-modal.html',
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controllerAs: 'vm',
      controller: function() {
        var vm = this;

        vm.$onInit = function () {
          vm.options = vm.resolve.options;
          vm.value = vm.options.value || '';
          vm.saveButtonText = vm.options.saveButtonText || 'Save';
          vm.validate = vm.options.validate || function(){return ''};
          vm.error = vm.validate(vm.value);
        };

        vm.keyup = function(e) {
          if (vm.value && !vm.error && e.keyCode === 13) {
            e.stopPropagation();
            vm.save();
          }

          vm.error = vm.validate(vm.value);
        };

        vm.save = function () {
          vm.close({ $value: vm.value });
        };

        vm.cancel = function () {
          vm.dismiss( );
        };
      }
    });
})();
