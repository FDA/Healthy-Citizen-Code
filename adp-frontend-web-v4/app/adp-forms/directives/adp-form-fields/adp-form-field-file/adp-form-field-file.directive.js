(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldFile', adpFormFieldFile);

  function adpFormFieldFile() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-file/adp-form-field-file.html'
    }
  }
})();
