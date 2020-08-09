;(function () {
  'use strict';

  angular
    .module('app.hcForms')
    .directive('hcFormFieldCheckbox', hcFormFieldCheckbox);

  function hcFormFieldCheckbox() {
    return {
      restrict: 'E',
      scope: {
        hcField: '=',
        hcFormData: '=',
        hcFieldUiProps: '='
      },
      templateUrl: 'app/hc-forms/directives/hc-form-fields/hc-form-field-checkbox/hc-form-field-checkbox.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.field = scope.hcField;
        scope.hcFormData[scope.field.keyName] = scope.hcFormData[scope.field.keyName] || '';
        scope.form = formCtrl;
        scope.uiProps = scope.hcFieldUiProps;
      }
    }
  }
})();
