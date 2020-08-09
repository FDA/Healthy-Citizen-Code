(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldString', adpFormFieldString);

  function adpFormFieldString() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-string/adp-form-field-string.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.field = scope.adpField;
        scope.adpFormData[scope.field.keyName] = scope.adpFormData[scope.field.keyName] || '';
        scope.form = formCtrl;
        scope.uiProps = scope.adpFieldUiProps;
      }
    }
  }
})();
