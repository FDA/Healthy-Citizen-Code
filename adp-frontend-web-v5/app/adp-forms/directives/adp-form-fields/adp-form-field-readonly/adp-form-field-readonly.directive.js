(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldReadonly', adpFormFieldReadonly);

  function adpFormFieldReadonly() {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-readonly/adp-form-field-readonly.html',
    }
  }
})();
