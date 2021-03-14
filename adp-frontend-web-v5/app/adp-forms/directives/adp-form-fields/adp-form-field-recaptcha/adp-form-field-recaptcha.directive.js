;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldRecaptcha', adpFormFieldRecaptcha);

  function adpFormFieldRecaptcha(APP_CONFIG) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-recaptcha/adp-form-field-recaptcha.html',
      require: '^^form',
      link: function (scope) {
        scope.captchaDisabled = APP_CONFIG.captchaDisabled;
      }
    }
  }
})();
