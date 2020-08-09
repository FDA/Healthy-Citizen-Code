(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldSelectMultiple', adpFormFieldSelectMultiple);

  function adpFormFieldSelectMultiple(
    AdpFieldsService,
    AdpFieldFormatUtil
  ) {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-select-multiple/adp-form-field-select-multiple.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.field = scope.adpField;

        scope.adpFormData[scope.field.keyName] = scope.adpFormData[scope.field.keyName] || [];

        scope.form = formCtrl;
        scope.uiProps = scope.adpFieldUiProps;

        scope.listOfValues = AdpFieldsService.getListOfOptions(scope.field.list);

        scope.options = {
          formatResult: AdpFieldFormatUtil.formatSelectLabel,
          formatSelection: AdpFieldFormatUtil.formatSelectSelection
        };
      }
    }
  }
})();
