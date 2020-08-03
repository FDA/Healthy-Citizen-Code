(function () {
  'use strict';

  angular.module('app.adpSyntheticGenerate').controller('AdpGenModalController', AdpGenModalController);

  /** @ngInject */
  function AdpGenModalController(
    AdpUnifiedArgs,
    $q
  ) {
    var vm = this;

    var fields = {
      recordsNum: {
        fieldName: 'recordsNum',
        type: 'Number',
        fullName: 'Number of records to be generated',
        validate: [{
          arguments: {
            limit: '1',
          },
          errorMessages: {
            default: 'Should be at least @limit',
          },
          validator: 'min',
        }],
        showInForm: true,
        fieldInfo: { read: true, write: true },
      },
      batchName: {
        fieldName: 'batchName',
        type: 'String',
        fullName: 'Generation job name',
        required: true,
        showInForm: true,
        fieldInfo: { read: true, write: true },
      },
    };

    vm.formParams = { btnText: 'Generate', title: 'Synthetic Content Generator' };

    vm.$onInit = function () {
      var schema = vm.resolve.options.schema;

      vm.args = AdpUnifiedArgs.getHelperParamsWithConfig({
        path: '',
        action: 'syntheticGenerate',
        schema: {
          type: 'Schema',
          schemaName: 'syntheticGenerate',
          fullName: 'syntheticGenerate',
          fields: fields,
        },
        formData: {
          recordsNum: 5,
          batchName: schema.fullName + ' generation at ' + moment().format('hh:mm MM/DD/YYYY'),
        },
      });

      vm.onCancel = function () {
        return vm.dismiss({ $value: 'cancel' });
      };

      vm.formOptions = {
        localActionsStrategy: {
          submit: function (args) {
            return $q.resolve()
              .then(function () {
                vm.close({ $value: args.row });
              });
          },
        },
        disableFullscreen: true,
      };
    };
  }
})();
