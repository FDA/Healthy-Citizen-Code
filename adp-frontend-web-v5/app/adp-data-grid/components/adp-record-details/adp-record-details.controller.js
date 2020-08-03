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
    ACTIONS
  ) {
    var vm = this;

    vm.$onInit = function onInit() {
      vm.fields = GridSchema.getFieldsForDetailedView(vm.schema);

      vm.formattedData = _.chain(vm.fields)
        .filter(function (f) { return f.showInViewDetails; })
        .map(getRowTemplate)
        .value();
    };

    function getRowTemplate(field) {
      var args = AdpUnifiedArgs.getHelperParamsWithConfig({
        path: field.fieldName,
        formData: vm.data,
        action: ACTIONS.VIEW_DETAILS,
        schema: vm.schema
      });

      return {
        name: field.fullName,
        template: template(args),
      }
    }

    function template(args) {
      var wrapper = $('<div>', {
        'class': 'name-' + args.fieldSchema.fieldName,
      });

      var template = HtmlCellRenderer(args)(args);
      wrapper.append(template);
      return wrapper;
    }
  }
})();
