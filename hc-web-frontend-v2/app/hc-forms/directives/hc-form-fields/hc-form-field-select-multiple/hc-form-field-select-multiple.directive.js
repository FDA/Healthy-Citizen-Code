(function () {
  'use strict';

  angular
    .module('app.hcForms')
    .directive('hcFormFieldSelectMultiple', hcFormFieldSelectMultiple);

  function hcFormFieldSelectMultiple(
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
      templateUrl: 'app/hc-forms/directives/hc-form-fields/hc-form-field-select-multiple/hc-form-field-select-multiple.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.field = scope.hcField;

        scope.hcFormData[scope.field.keyName] = scope.hcFormData[scope.field.keyName] || [];

        scope.form = formCtrl;
        scope.uiProps = scope.hcFieldUiProps;

        scope.listOfValues = HcFieldsService.listToArray(LISTS[scope.field.list]);

        scope.options = {
          formatResult: HcFieldFormatUtil.formatSelectLabel,
          formatSelection: HcFieldFormatUtil.formatSelectSelection
        };
      }
    }
  }
})();
