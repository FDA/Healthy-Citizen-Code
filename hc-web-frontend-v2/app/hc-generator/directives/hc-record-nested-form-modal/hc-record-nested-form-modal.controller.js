;(function () {
  'use strict';

  angular
    .module('app.hcGenerator')
    .controller('HcRecordNestedModalController', HcRecordNestedModalController);

  /** @ngInject */
  function HcRecordNestedModalController(HcDataService) {
    var vm = this;

    vm.$onInit = function () {
      var options = vm.resolve.options;

      vm.fields = options.fields;

      vm.parentField = vm.fields.parentId;
      vm.data = options.data || {};
      vm.pageParams = options.pageParams;

      vm.isNewRecord = vm.resolve.options['actionType'] === 'create';
      vm.action = vm.isNewRecord ? 'Add' : 'Update';

      vm.createParentCallback = options.createParentCallback;
    };

    vm.cancel = function () {
      vm.dismiss({$value: 'cancel'});
    };

    vm.submit = function (formData) {
      var action = vm.isNewRecord ?
        HcDataService.createNestedRecord :
        HcDataService.updateNestedRecord;

      return action(
        vm.pageParams.link,
        formData,
        vm.pageParams.fieldName,
        vm.data._id
      )
      .then(function (response) {
        vm.close({$value: response.data});
      });
    };
  }
})();
