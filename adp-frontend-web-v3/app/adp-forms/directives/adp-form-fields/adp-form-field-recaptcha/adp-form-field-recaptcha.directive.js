;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldRecaptcha', adpFormFieldCheckbox);

  function adpFormFieldCheckbox(CONSTANTS) {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-recaptcha/adp-form-field-recaptcha.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.field = scope.adpField;
        scope.adpFormData[scope.field.keyName] = scope.adpFormData[scope.field.keyName] || '';
        scope.form = formCtrl;
        scope.uiProps = scope.adpFieldUiProps;

        scope.key = CONSTANTS.reCaptchaKey;
        scope.captchaDisabled = CONSTANTS.captchaDisabled;
      }
    }
  }
})();
