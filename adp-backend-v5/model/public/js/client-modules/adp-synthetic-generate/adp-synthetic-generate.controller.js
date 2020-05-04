(function () {
  'use strict';

  angular.module('app.adpSyntheticGenerate').controller('AdpGenModalController', AdpGenModalController);

  /** @ngInject */
  function AdpGenModalController() {
    var vm = this;

    vm.fields = [
      {
        fieldName: 'recordsNum',
        type: 'Number',
        fullName: 'Number of records to be generated',
        validate: [
          {
            arguments: {
              limit: '1',
            },
            errorMessages: {
              default: 'Should be at least @limit',
            },
            validator: 'min',
          },
        ],
        showInForm: true,
        fieldInfo: { read: true, write: true },
      },
      {
        fieldName: 'batchName',
        type: 'String',
        fullName: 'Generation job name',
        required: true,
        showInForm: true,
        fieldInfo: { read: true, write: true },
      },
    ];

    vm.formParams = { btnText: 'Generate', title: 'Synthetic Content Generator' };

    vm.$onInit = function () {
      vm.schema = vm.resolve.options.schema;

      vm.data = {
        recordsNum: 5,
        batchName: vm.schema.fullName + ' generation at ' + moment().format('hh:mm MM/DD/YYYY'),
      };
    };

    vm.onCancel = function () {
      vm.dismiss();
    };

    vm.onSubmit = function (data) {
      if (_.isFunction(vm.resolve.options.onSubmit)) {
        vm.resolve.options.onSubmit(data);
      }
      vm.close({ $value: data });
    };
  }
})();
