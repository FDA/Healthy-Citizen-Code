;(function () {
  'use strict';

  angular
    .module('app.hcForms')
    .directive('hcForm', hcForm);

  function hcForm(HcFieldsService) {
    return {
      restrict: 'E',
      scope: {
        hcFields: '=',
        hcData: '=',
        hcSubmit: '='
      },
      transclude: {
        'header': '?formHeader',
        'body': '?formBody',
        'footer': 'formFooter'
      },
      replace: true,
      templateUrl: 'app/hc-forms/directives/hc-form/hc-form.html',
      link: function (scope, element) {
        scope.formData = scope.hcData || {};
        scope.fields = HcFieldsService.getFormFields(scope.hcFields);
        scope.loading = false;

        // should return promise
        scope.submit = function () {
          scope.loading = true;

          scope.hcSubmit(scope.formData)
            .then(function () {
              scope.loading = false;
            });
        };

        scope.$watch('[form.$invalid, loading]', updateDisabledState);
        function updateDisabledState(values) {
          if (!element || !element.find('[type="submit"]').length) return;
          var invalid = values[0],
              loading = values[1];

          element.find('[type="submit"]')
            .prop('disabled', invalid || loading);
        }

        scope.$watch(function () {
          return angular.toJson(scope.form);
        }, forceValidation);

        function forceValidation() {
          scope.fields.forEach(function (field) {
            if (field.keyName in scope.form) scope.form[field.keyName].$validate();
          });
        }
      }
    }
  }
})();
