(function () {
  'use strict';

  angular
    .module('app.hcForms')
    .directive('hcFormFieldSelect', hcFormFieldSelect);

  function hcFormFieldSelect(
    LISTS,
    HcFieldsService,
    HcFieldFormatUtil
  ) {
    return {
      restrict: 'E',
      scope: {
        hcField: '=',
        hcFormData: '=',
        hcFieldUiProps: '='
      },
      templateUrl: 'app/hc-forms/directives/hc-form-fields/hc-form-field-select/hc-form-field-select.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.field = scope.hcField;

        scope.hcFormData[scope.field.keyName] = scope.hcFormData[scope.field.keyName] || '';
        scope.form = formCtrl;
        scope.uiProps = scope.hcFieldUiProps;

        scope.listOfValues = HcFieldsService.listToArray(LISTS[scope.field.list]);

        scope.options = {
          formatResult: HcFieldFormatUtil.formatSelectLabel,
          formatSelection: HcFieldFormatUtil.formatSelectSelection
        };

        // hiding search input
        // https://github.com/select2/select2/issues/489#issuecomment-100602293
        if (scope.listOfValues.length < 10) {
          scope.options.minimumResultsForSearch = -1;
        }
      }
    }
  }
})();
