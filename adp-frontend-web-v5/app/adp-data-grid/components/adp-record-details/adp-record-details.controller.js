;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .controller('adpRecordDetailsController', adpRecordDetailsController);

  /** @ngInject */
  function adpRecordDetailsController(
    AdpUnifiedArgs,
    HtmlCellRenderer,
    GridSchema,
    ACTIONS,
    EvalShowIn
  ) {
    var vm = this;
    vm.$onInit = function onInit() {
      var fields = GridSchema.getFieldsForDetailedView(vm.schema);
      var recordData = presetRecordWithNull(vm.data, fields);
      vm.record = EvalShowIn.forViewDetails(unifiedArgs(recordData));
      vm.fields = GridSchema.groupFieldsIntoUiGroups(fields);
    };

    vm.selectColumnClass = function (field) {
      var fieldWidth = field.formWidth || 12;
      return ['adp-col', 'adp-col-' + fieldWidth];
    }

    vm.showValue = function (field) {
      return field.type === 'Blank' || !_.isUndefined(vm.record[field.fieldName]);
    }

    vm.showAccordion = function () {
      return !_.isEmpty(vm.fields.groups);
    }

    function presetRecordWithNull(data, fields) {
      return _.transform(fields, function (result, field) {
        var fieldName = field.fieldName;
        result[fieldName] = _.isUndefined(data[fieldName]) ? null : data[fieldName];
      }, {});
    }

    function unifiedArgs(recordData) {
      return AdpUnifiedArgs.getHelperParamsWithConfig({
        path: '',
        formData: recordData,
        schema: vm.schema,
        action: ACTIONS.VIEW_DETAILS,
      });
    }
  }
})();
