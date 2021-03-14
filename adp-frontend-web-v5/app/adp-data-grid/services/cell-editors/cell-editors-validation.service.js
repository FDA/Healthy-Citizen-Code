;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('CellEditorsValidationService', CellEditorsValidationService);

  /** @ngInject */
  function CellEditorsValidationService(
    AdpValidationMessages,
    AdpValidationRules,
    AdpUnifiedArgs,
    ACTIONS
  ) {
    var requiredValidator = { type: 'required' };

    return {
      getValidators: getValidators,
      getMessage: getMessage,
    }

    function getValidators(schema, fieldName) {
      var field = schema.fields[fieldName];
      var rules = [];
      if (field.required === true) {
        rules.push(requiredValidator);
      }

      if (field.type === 'Decimal128') {
        var DECIMAL_REGEX = /^[+-]?(\d+)?\.?(\d+)?([Ee][+-]?(\d+))?$/;

        rules.push({
          type: 'pattern',
          pattern: DECIMAL_REGEX,
          message: 'Please enter correct decimal value'
        });
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
            var args = getArgs(field.fieldName, schema, e.data, validatorRule);
            return AdpValidationRules[validatorRule.validator](args);
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

    function getArgs(fieldName, schema, row, validationRule) {
      var args = AdpUnifiedArgs.getHelperParamsWithConfig({
        path: fieldName,
        formData: row,
        action: ACTIONS.UPDATE,
        schema: schema,
      });
      args.validationRule = validationRule;

      return args;
    }
  }
})();
