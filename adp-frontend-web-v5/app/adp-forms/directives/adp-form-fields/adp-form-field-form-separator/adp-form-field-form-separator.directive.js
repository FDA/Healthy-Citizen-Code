;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldFormSeparator', adpFormFieldFormSeparator);

  function adpFormFieldFormSeparator() {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-form-separator/adp-form-field-form-separator.html'
    }
  }
})();
