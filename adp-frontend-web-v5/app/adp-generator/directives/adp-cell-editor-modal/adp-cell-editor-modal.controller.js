;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .controller('AdpCellEditorModalController', AdpCellEditorModalController);

  /** @ngInject */
  function AdpCellEditorModalController(
    ACTIONS,
    $q
  ) {
    var vm = this;

    vm.$onInit = function () {
      vm.args = vm.resolve.options.args;

      vm.formOptions = {
        localActionsStrategy: {
          submit: function (args) {
            return $q.resolve()
              .then(function () {
                vm.close({ $value: args.row });
              });
          },
        },
        cloneParams: vm.resolve.options.cloneParams,
      };

      vm.cancel = function () {
        vm.dismiss({ $value: 'cancel' });
      };

      vm.actionText = selectActionText(vm.args.action);

      function selectActionText(action) {
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
