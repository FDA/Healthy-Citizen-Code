;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('CellEditorsValidationService', CellEditorsValidationService);

  /** @ngInject */
  function CellEditorsValidationService(
    AdpValidationMessages,
    AdpValidationRules
  ) {
    var requiredValidator = { type: 'required' };

    return {
      getValidators: getValidators,
      getMessage: getMessage,
    }

    function getValidators(field) {
      var rules = [];
      if (field.required === true) {
        rules.push(requiredValidator);
      }

      (field.validate || []).forEach(function (validatorRule) {
        if (!AdpValidationRules[validatorRule.validator]) {
          return;
        }

        rules.push({
          type: 'custom',
          ignoreEmptyValue: true,
          reevaluate: true,
          validationCallback: function (e) {
            e.rule.message = AdpValidationMessages.update(e.value, field, validatorRule);
            return AdpValidationRules[validatorRule.validator](e.value, field, validatorRule);
          }
        });
      });

      return rules;
    }

    function getMessage(value, field, validatorRule) {
      if (validatorRule.validator === 'required') {
        return '"' + field.fullName + '" is required.';
      }

      return AdpValidationMessages.update(value, field, validatorRule);
    }
  }
})();
