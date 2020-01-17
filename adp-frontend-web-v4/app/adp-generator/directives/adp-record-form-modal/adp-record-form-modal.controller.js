;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .controller('AdpRecordModalController', AdpRecordModalController);

  /** @ngInject */
  function AdpRecordModalController(
    AdpDataService,
    $transitions,
    $uibModalStack
  ) {
    var vm = this;

    vm.$onInit = function () {
      vm.schema = vm.resolve.options.schema;
      vm.fields = vm.resolve.options.fields;
      vm.formParams = vm.resolve.options.formParams;
      vm.data = vm.resolve.options.data || {};
      vm.link = vm.resolve.options.link;

      var $action = vm.formParams.actionType;

      vm.isNewRecord = $action === 'create' || $action === 'clone';

      if (vm.formParams.btnText) {
        vm.btnText = vm.formParams.btnText;
      } else {
        vm.btnText = vm.isNewRecord ? 'Add' : 'Update';
      }

      bindEvents();
    };

    vm.$onDestroy = function() {
      vm.destroyTransitionListener();
    };

    vm.cancel = function () {
      vm.dismiss({$value: 'cancel'});
    };

    vm.submit = function (formData) {
      var action = vm.isNewRecord ? AdpDataService.createRecord : AdpDataService.updateRecord;

      return action(vm.link, formData)
        .then(function (response) {
          if (response.data.success) {
            var returnValue = {
              data: response.data,
              options: vm.resolve.options
            };
            vm.close({$value: returnValue});
          }
        });
    };

    function bindEvents() {
      vm.destroyTransitionListener = $transitions.onStart(null, function (transition) {
        var toState = transition.to();
        var fromState = transition.from();
        if (toState.name === fromState.name) {
          return;
        }

        $uibModalStack.dismissAll('State transition');
      });
    }
  }
})();
