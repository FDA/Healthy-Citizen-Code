(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldDefault', adpFormFieldDefault);

  function adpFormFieldDefault() {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-default/adp-form-field-default.html',
    }
  }
})();
