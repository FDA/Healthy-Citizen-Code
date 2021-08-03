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
      vm.fields = GridSchema.getFieldsForDetailedView(vm.schema);

      var recordData = presetRecordWithNull(vm.data, vm.fields);
      var filteredData = EvalShowIn.forViewDetails(unifiedArgs(recordData));

      vm.templates = _.chain(vm.fields)
        .map(function (field) {
          return _.isUndefined(filteredData[field.fieldName]) ?
            null :
            getRowTemplate(field, recordData);
        })
        .compact()
        .value();
    };

    vm.showClipboardBtn = function (args) {
      return ['Code', 'Html', 'Mixed', 'Text'].includes(args.fieldSchema.type);
    };

    function getRowTemplate(field, record) {
      var args = unifiedArgs(record, field.fieldName);
      var fieldName = field.fieldName;

      return {
        args: args,
        fieldName: fieldName,
        type: field.type,
        rowClass: [
          'view-details-row',
          'view-details-row-' + fieldName,

        ],
        template: template(args),
      }
    }

    function unifiedArgs(formData, path) {
      return AdpUnifiedArgs.getHelperParamsWithConfig({
        path: path || '',
        formData: formData,
        action: ACTIONS.VIEW_DETAILS,
        schema: vm.schema,
      });
    }

    function presetRecordWithNull(data, fields) {
      return _.transform(fields, function (result, field) {
        var fieldName = field.fieldName;
        result[fieldName] = _.isUndefined(data[fieldName]) ? null : data[fieldName];
      }, {});
    }

     function template(args) {
      var $wrapper = $('<div>', {
        'class': [
          'name-' + args.fieldSchema.fieldName,
          'view-details-cell-type-' + args.fieldSchema.type.toLowerCase(),
          getMixedAdditionalClassName(args),
        ].join(' '),
      });
      $wrapper.append(HtmlCellRenderer(args));

      return $wrapper;
    }

    function getMixedAdditionalClassName(args) {
      if (args.fieldSchema.type !== 'Mixed') {
        return '';
      }

      if (_.isNil(args.data) || typeof args.data !== 'object') {
        return 'view-details-cell-type-mixed-as-primitive'
      }

      return '';
    }
  }
})();
