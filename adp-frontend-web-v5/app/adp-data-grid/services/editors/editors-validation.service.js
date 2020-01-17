;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('EditorsValidationService', EditorsValidationService);

  /** @ngInject */
  function EditorsValidationService(
    AdpValidationMessages
  ) {
    var validationCbs = {
      required: {
        type: 'required',
        schemaValidatorRule: { validator: 'required' },
      },
      minLength: function (value, field, validatorRule) {
        var limit = parseInt(validatorRule.arguments.length);
        return value.length >= limit;
      },
      maxLength: function (value, field, validatorRule) {
        var limit = parseInt(validatorRule.arguments.length);
        return value.length <= limit;
      }
    };

    return {
      getValidators: getValidators,
      getMessage: getMessage,
    }

    function getValidators(field) {
      var rules = [];
      if (field.required === true) {
        rules.push(validationCbs.required);
      }

      (field.validate || []).forEach(function (validatorRule) {
        if (!validationCbs[validatorRule.validator]) {
          return;
        }

        rules.push({
          type: 'custom',
          ignoreEmptyValue: true,
          reevaluate: true,
          validationCallback: function (e) {
            return validationCbs[validatorRule.validator](e.value, field, validatorRule);
          },
          schemaValidatorRule: validatorRule,
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
