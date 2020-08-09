;(function () {
  'use strict';

  angular
    .module('app.hcForms')
    .directive('hcFormFieldDate', hcFormFieldDate);

  function hcFormFieldDate(BS_DATE_FORMAT) {
    return {
      restrict: 'E',
      scope: {
        hcField: '=',
        hcFormData: '=',
        hcFieldUiProps: '='
      },
      templateUrl: 'app/hc-forms/directives/hc-form-fields/hc-form-field-date/hc-form-field-date.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.field = scope.hcField;
        scope.hcFormData[scope.field.keyName] = scope.hcFormData[scope.field.keyName] || '';
        scope.form = formCtrl;
        scope.uiProps = scope.hcFieldUiProps;

        scope.datepickerOptions = {
          dateFormat: BS_DATE_FORMAT,
          changeMonth: true,
          changeYear: true,
          showOn: 'button',
          buttonText: ''
        };

        var hasMaxDate = _.find(scope.field.validate, function (validator) {
          return validator.validator === 'notInFuture';
        });

        if (hasMaxDate) {
          scope.datepickerOptions.maxDate = '0d';
        }
      }
    }
  }
})();
