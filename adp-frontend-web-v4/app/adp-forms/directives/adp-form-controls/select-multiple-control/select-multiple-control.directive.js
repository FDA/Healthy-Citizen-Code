(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('selectMultipleControl', selectMultipleControl);

  function selectMultipleControl(
    AdpFieldsService,
    AdpValidationService,
    $timeout
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/select-multiple-control/select-multiple-control.html',
      require: '^^form',
      link: function (scope, element, attrs) {
        scope.adpFormData[scope.field.keyName] = scope.adpFormData[scope.field.keyName] || [];
        scope.listOfValues = AdpFieldsService.getListOfOptions(scope.field.list);

        scope.options = {
          formatResult: function (state) {
            return state.text;
          },
          formatSelection: function (state) {
            return state.text;
          }
        };

        scope.isRequired = AdpValidationService.isRequired(scope.validationParams.formParams);

        // HACK
        $timeout(function () {
          var input = element[0].querySelector('.select2-input');
          input.autocomplete = AdpFieldsService.autocompleteValue(scope.field);
        });
      }
    }
  }
})();
