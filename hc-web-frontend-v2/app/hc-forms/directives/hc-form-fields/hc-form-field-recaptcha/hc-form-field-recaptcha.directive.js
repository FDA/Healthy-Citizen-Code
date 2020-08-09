;(function () {
  'use strict';

  angular
    .module('app.hcForms')
    .directive('hcFormFieldRecaptcha', hcFormFieldCheckbox);

  function hcFormFieldCheckbox(CONSTANTS) {
    return {
      restrict: 'E',
      scope: {
        hcField: '=',
        hcFormData: '=',
        hcFieldUiProps: '='
      },
      templateUrl: 'app/hc-forms/directives/hc-form-fields/hc-form-field-recaptcha/hc-form-field-recaptcha.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.field = scope.hcField;
        scope.hcFormData[scope.field.keyName] = scope.hcFormData[scope.field.keyName] || '';
        scope.form = formCtrl;
        scope.uiProps = scope.hcFieldUiProps;

        scope.key = CONSTANTS.reCaptchaKey;
        scope.captchaDisabled = CONSTANTS.captchaDisabled;
      }
    }
  }
})();
