;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .controller('AdpRecordModalController', AdpRecordModalController);

  /** @ngInject */
  function AdpRecordModalController(ACTIONS) {
    var vm = this;

    vm.$onInit = function () {
      vm.args = vm.resolve.options.args;

      vm.formOptions = {
        schemaActionsStrategy: {
          onComplete: function () {
            vm.close();
          },
          onCancel: function () {
            vm.close();
          },
        },
        cloneParams: vm.resolve.options.cloneParams,
      };

      vm.headerText = selectHeaderText(vm.args.action);

      function selectHeaderText(action) {
        var actionName = action.replace('cell-editing-', '');
        var texts = {};
        texts[ACTIONS.CREATE] = 'Add';
        texts[ACTIONS.CLONE] = 'Add';
        texts[ACTIONS.CLONE_DATASET] = 'Add';
        texts[ACTIONS.UPDATE] = 'Update';

        return texts[actionName];
      }
    };
  }
})();
