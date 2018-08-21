;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('recaptchaControl', recaptchaControl);

  function recaptchaControl(APP_CONFIG) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/recaptcha-control/recaptcha-control.html',
      require: '^^form',
      link: function (scope) {
        scope.adpFormData[scope.field.keyName] = scope.adpFormData[scope.field.keyName] || '';
        scope.key = APP_CONFIG.reCaptchaKey;
      }
    }
  }
})();
