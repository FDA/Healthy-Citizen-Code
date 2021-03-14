;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldBlank', adpFormFieldBlank);

  function adpFormFieldBlank() {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-blank/adp-form-field-blank.html'
    }
  }
})();
