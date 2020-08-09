(function () {
  'use strict';

  angular
    .module('app.hcForms')
    .directive('hcFormFieldString', hcFormFieldString);

  function hcFormFieldString() {
    return {
      restrict: 'E',
      scope: {
        hcField: '=',
        hcFormData: '=',
        hcFieldUiProps: '='
      },
      templateUrl: 'app/hc-forms/directives/hc-form-fields/hc-form-field-string/hc-form-field-string.html',
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
