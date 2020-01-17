;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpValidationRules', AdpValidationRules);

  function AdpValidationRules(AdpValidationUtils) {
    // noop(), always valid
    function noopValidator() { return true; }

    var minMaxValidators = {
      minString: function (viewValue, validationArguments) {
        if (!viewValue) return true;

        var limit = parseInt(validationArguments.limit);
        return AdpValidationUtils.minString(viewValue.length, limit);
      },

      maxString: function (viewValue, validationArguments) {
        if (!viewValue) return true;

        var limit = parseInt(validationArguments.limit);
        return AdpValidationUtils.maxString(viewValue.length, limit);
      },

      minNumber: function (viewValue, validationArguments) {
        var limit = parseFloat(validationArguments.limit);

        if (_.isNull(viewValue)) return true;
        return viewValue >= limit;
      },

      maxNumber: function (viewValue, validationArguments) {
        var limit = parseFloat(validationArguments.limit);

        if (_.isNull(viewValue)) return true;
        return viewValue <= limit;
      },

      minDate: function (viewValue, validationArguments, form, validationParams) {
        var fieldType = validationParams.field.type;
        var dates = AdpValidationUtils.formatDatesBeforeComparision(viewValue, validationArguments.limit, fieldType);

        if (_.isNil(dates)) {
          return true;
        }

        return moment(dates.value).isSameOrAfter(dates.comparisionDate, 'day');
      },

      maxDate: function (viewValue, validationArguments, form, validationParams) {
        var fieldType = validationParams.field.type;
        var dates = AdpValidationUtils.formatDatesBeforeComparision(viewValue, validationArguments.limit, fieldType);

        if (_.isNil(dates)) {
          return true;
        }

        return moment(dates.value).isSameOrBefore(dates.comparisionDate, 'day');
      },

      minTime: function (viewValue, validationArguments, form, validationParams) {
        var fieldType = validationParams.field.type;
        var dates = AdpValidationUtils.formatDatesBeforeComparision(viewValue, validationArguments.limit, fieldType);

        if (_.isNil(dates)) {
          return true;
        }

        var lhs = AdpValidationUtils.getMinutesOfDay(dates.value);
        var rhs = AdpValidationUtils.getMinutesOfDay(dates.comparisionDate);

        return lhs >= rhs;
      },

      maxTime: function (viewValue, validationArguments, form, validationParams) {
        var fieldType = validationParams.field.type;
        var dates = AdpValidationUtils.formatDatesBeforeComparision(viewValue, validationArguments.limit, fieldType);
        if (_.isNil(dates)) {
          return true;
        }

        console.log(dates)
        var lhs = AdpValidationUtils.getMinutesOfDay(dates.value);
        var rhs = AdpValidationUtils.getMinutesOfDay(dates.comparisionDate);

        return lhs <= rhs;
      },

      minDateTime: function (viewValue, validationArguments, form, validationParams) {
        var fieldType = validationParams.field.type;
        var dates = AdpValidationUtils.formatDatesBeforeComparision(viewValue, validationArguments.limit, fieldType);
        if (_.isNil(dates)) {
          return true;
        }

        return moment(dates.value).isSameOrAfter(dates.comparisionDate);
      },

      maxDateTime: function (viewValue, validationArguments, form, validationParams) {
        var fieldType = validationParams.field.type;
        var dates = AdpValidationUtils.formatDatesBeforeComparision(viewValue, validationArguments.limit, fieldType);

        if (_.isNil(dates)) {
          return true;
        }

        return moment(dates.value).isSameOrBefore(dates.comparisionDate);
      },
      minImperialHeight: noopValidator,
      minImperialWeightWithOz: noopValidator,
      minImperialWeight: noopValidator,
      maxImperialHeight: noopValidator,
      maxImperialWeightWithOz: noopValidator,
      maxImperialWeight: noopValidator,
    };

    var VALIDATION_RULES = {
      regex: function (viewValue, validationArguments) {
        if (!viewValue) return true;
        var regex = new RegExp(validationArguments['regex'], validationArguments['regexOptions']);

        return regex.test(viewValue);
      },

      min: function(viewValue, validationArguments, form, validationParams) {
        var fieldType = validationParams.field.type;
        var ruleName = 'min' + fieldType;

        return minMaxValidators[ruleName].apply(null, arguments);
      },

      max: function(viewValue, validationArguments, form, validationParams) {
        var fieldType = validationParams.field.type;
        var ruleName = 'max' + fieldType;

        return minMaxValidators[ruleName].apply(null, arguments);
      },

      maxLength: function (viewValue, validationArguments) {
        if (!viewValue) return true;

        var limit = parseInt(validationArguments.length);
        return AdpValidationUtils.maxString(viewValue.length, limit);
      },

      minLength: function (viewValue, validationArguments) {
        if (!viewValue) return true;

        var limit = parseInt(validationArguments.length);
        return AdpValidationUtils.minString(viewValue.length, limit);
      },

      passwordMatch: function(viewValue, validationArguments, form) {
        var fieldValue = viewValue;
        var matchedValue = form[validationArguments.matchedField].$viewValue;

        return fieldValue === matchedValue;
      },

      notInFuture: noopValidator,
      notInPast: noopValidator,
      imperialHeightRange: noopValidator,
    };

    return function (validationParams, form ) {
      var field = validationParams.field;
      var validationRules = field.validate || [];
      var result = [];

      validationRules.forEach(function (rule) {
        var ruleName = rule.validator;
        if (!VALIDATION_RULES[rule.validator]) {
          return;
        }

        result[ruleName] = function (viewValue) {
          return VALIDATION_RULES[ruleName](
            viewValue,
            rule.arguments,
            form,
            validationParams
          );
        }
      });

      return result;
    }
  }
})();
