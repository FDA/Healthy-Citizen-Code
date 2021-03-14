(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldStaticHtml', adpFormFieldStaticHtml);

  function adpFormFieldStaticHtml() {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-static-html/adp-form-field-static-html.html',
    }
  }
})();
