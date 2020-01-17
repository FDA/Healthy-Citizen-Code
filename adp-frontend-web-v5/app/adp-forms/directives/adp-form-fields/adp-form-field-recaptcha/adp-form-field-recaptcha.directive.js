;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldRecaptcha', adpFormFieldRecaptcha);

  function adpFormFieldRecaptcha(APP_CONFIG) {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-recaptcha/adp-form-field-recaptcha.html',
      require: '^^form',
      link: function (scope) {
        scope.adpFormData[scope.adpField.fieldName] = scope.adpFormData[scope.adpField.fieldName] || '';
        scope.key = APP_CONFIG.reCaptchaKey;
        scope.captchaDisabled = APP_CONFIG.captchaDisabled;
      }
    }
  }
})();
