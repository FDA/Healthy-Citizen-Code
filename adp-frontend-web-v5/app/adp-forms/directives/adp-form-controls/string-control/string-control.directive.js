(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('stringControl', stringControl);

  function stringControl(
    AdpValidationUtils,
    AdpFieldsService
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '<',
        adpFormData: '<',
        uiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/string-control/string-control.html',
      require: '^^form',
      link: function (scope) {
        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
        scope.config = getConfig(scope.field);

        function getConfig(field) {
          var defaults = {
            mode: getInputType(),
            inputAttr: {
              autocomplete: AdpFieldsService.autocompleteValue(field),
            },
            valueChangeEvent: 'input blur',
          };
          addMask(defaults);

          return AdpFieldsService.configFromParameters(field, defaults);
        }

        function getInputType() {
          var types = {
            'Email': 'email',
            'PasswordAuth': 'password',
            'Url': 'url',
          };

          return types[scope.field.type] || 'text';
        }

        function addMask(config) {
          if (scope.field.type !== 'Phone') {
            return;
          }

          _.assign(config, {
            mask: 'X00-X00-0000',
            maskRules: { X: /[02-9]/ },
            maskChar: 'x',
            maskInvalidMessage: false,
            showMaskMode: 'onFocus',
          });
        }
      }
    }
  }
})();
