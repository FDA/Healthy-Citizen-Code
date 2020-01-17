;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpValidationMessages', AdpValidationMessages);

  function AdpValidationMessages(
    AdpSchemaService,
    AdpValidationRules,
    AdpValidationUtils
  ) {
    function updateAll(field, formData) {
      var messages = {};

      (field.validate ||[]).forEach(function (validationRule) {
        var value = formData[field.fieldName];
        messages[validationRule.validator] = update(value, field, validationRule, formData);
      });

      return messages;
    }

    function update(value, field, validationRule, formData) {
      var TEMPLATE_REGEX = {
        VAL: /(\$val)/,
        ARG_VAL: /\$(\w+)/,
        FULL_NAME: /@(\w+)/,
        MATCHED_VAL: /#(\w+)/,
      };

      var message = _getMessage(field, validationRule);

      return message
        .replace(TEMPLATE_REGEX.VAL, function () {
          return _replaceByValue(value, field);
        })
        .replace(TEMPLATE_REGEX.ARG_VAL, function (argNameWithPrefix, argName) {
          return _replaceByValueArg(validationRule, argName);
        })
        .replace(TEMPLATE_REGEX.MATCHED_VAL, function (argNameWithPrefix, argName) {
          return _replaceByMatchedValue(validationRule, field, argName, formData);
        })
        .replace(TEMPLATE_REGEX.FULL_NAME, function (argNameWithPrefix, argName) {
          return _replaceByFullName(validationRule, field, argName);
        })
        .replace(/@@/g, '@')
        .replace(/\$\$/g, '$');
    }

    function _getMessage(field, validator) {
      var messageName;

      if (_isDate(field.type, validator)) {
        messageName = field.type.toLowerCase();
      }

      return validator.errorMessages[messageName] || validator.errorMessages['default'];
    }

    function _replaceByValue(value, field) {
      if (_isDate(field.type)) {
        return AdpValidationUtils.formatDate(value, field);
      }

      return value;
    }

    function _replaceByValueArg(validationRule, argName) {
      return validationRule.arguments[argName] || argName;
    }

    function _replaceByMatchedValue(validationRule, field, argName, formData) {
      var argument = validationRule.arguments[argName];

      if (argument[0] === '$') {
        var matchedFieldName = validationRule.arguments[argName].slice(1);
        var value = formData[matchedFieldName];

        return _isDate(field.type) ?
          AdpValidationUtils.formatDate(argument, field) :
          value;
      } else {
        return _isDate(field.type) ?
          AdpValidationUtils.formatDate(argument, field) :
          argument;
      }
    }

    function _replaceByFullName(validationRule, field, argName) {
      var argument = validationRule.arguments[argName];

      if (argument[0] === '$') {
        var matchedFieldName = validationRule.arguments[argName].slice(1);
        var fields = AdpSchemaService.getCurrentSchema().fields;

        return fields[matchedFieldName].fullName;
      } else {
        return _isDate(field.type) ?
          AdpValidationUtils.formatDate(argument, field) :
          argument;
      }
    }

    function _isDate(type) {
      return type.includes('Date') || type.includes('Time');
    }

    return {
      updateAll: updateAll,
      update: update,
    };
  }
})();
