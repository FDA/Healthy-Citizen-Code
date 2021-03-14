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
        .filter(evalShowExpr)
        .map(getRowTemplate)
        .value();
    };

    function evalShowExpr(field) {
      var args = getArgs(field);

      try {
        return new Function('return ' + field.showInViewDetails).call(args);
      } catch (e) {
        console.error('Error while evaluating show attribute for: ', e, args.path);
      }
    }

    function getRowTemplate(field) {
      var args = getArgs(field);

      return {
        name: field.fullName,
        template: template(args),
      }
    }

    function getArgs(field) {
      return AdpUnifiedArgs.getHelperParamsWithConfig({
        path: field.fieldName,
        formData: vm.data,
        action: ACTIONS.VIEW_DETAILS,
        schema: vm.schema,
      });
    }

     function template(args) {
      var $wrapper = $('<div>', {
        'class': ['name-' + args.fieldSchema.fieldName, 'view-details-cell-type-' + args.fieldSchema.type.toLowerCase()].join(' '),
      });
      $wrapper.append(HtmlCellRenderer(args));

      return $wrapper;
    }
  }
})();
