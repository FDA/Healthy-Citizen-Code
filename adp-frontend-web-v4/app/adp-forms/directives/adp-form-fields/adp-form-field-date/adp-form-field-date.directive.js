;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldDate', adpFormFieldDate);

  function adpFormFieldDate() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-date/adp-form-field-date.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.form = formCtrl;

        scope.isError = function () {
          var model = scope.form[scope.adpField.keyName];

          if (model.$error.dateValid) {
            return model.$touched && model.$invalid;
          } else {
            return (scope.form.$submitted || model.$dirty) && model.$invalid;
          }
        }
      }
    }
  }
})();
