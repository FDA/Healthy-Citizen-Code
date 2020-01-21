(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpValidationRules', AdpValidationRules);

  function AdpValidationRules(AdpValidationUtils) {
    // noop(), always valid
    function noopValidator() { return true; }

    var minMaxValidators = {
      minString: function (value, field, validationRule) {
        var limit = parseInt(validationRule.arguments.limit);
        return AdpValidationUtils.minString(value, limit);
      },

      maxString: function (value, field, validationRule) {
        var limit = parseInt(validationRule.arguments.limit);
        return AdpValidationUtils.maxString(value, limit);
      },

      minNumber: function (value, field, validationRule) {
        var limit = parseFloat(validationRule.arguments.limit);
        return value >= limit;
      },

      maxNumber: function (value, field, validationRule) {
        var limit = parseFloat(validationRule.arguments.limit);
        return value <= limit;
      },

      minDate: function (value, field, validationRule) {
        var dates = prepareDateForComparision(value, validationRule.arguments.limit, field.type);
        if (_.isNil(dates)) {
          return true;
        }

        return moment(dates.value).isSameOrAfter(dates.comparisionDate, 'day');
      },

      maxDate: function (value, field, validationRule) {
        var dates = prepareDateForComparision(value, validationRule.arguments.limit, field.type);
        if (_.isNil(dates)) {
          return true;
        }

        return moment(dates.value).isSameOrBefore(dates.comparisionDate, 'day');
      },

      minTime: function (value, field, validationRule) {
        var dates = prepareDateForComparision(value, validationRule.arguments.limit, field.type);
        if (_.isNil(dates)) {
          return true;
        }

        var lhs = AdpValidationUtils.getMinutesOfDay(dates.value);
        var rhs = AdpValidationUtils.getMinutesOfDay(dates.comparisionDate);

        return lhs >= rhs;
      },

      maxTime: function (value, field, validationRule) {
        var dates = prepareDateForComparision(value, validationRule.arguments.limit, field.type);
        if (_.isNil(dates)) {
          return true;
        }

        var lhs = AdpValidationUtils.getMinutesOfDay(dates.value);
        var rhs = AdpValidationUtils.getMinutesOfDay(dates.comparisionDate);

        return lhs <= rhs;
      },

      minDateTime: function (value, field, validationRule) {
        var dates = prepareDateForComparision(value, validationRule.arguments.limit, field.type);
        if (_.isNil(dates)) {
          return true;
        }

        return moment(dates.value).isSameOrAfter(dates.comparisionDate);
      },

      maxDateTime: function (value, field, validationRule) {
        var dates = prepareDateForComparision(value, validationRule.arguments.limit, field.type);
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

    return {
      regex: function (value, field, validationRule) {
        var regexPart = validationRule.arguments.regex;
        var regexOptionsPart = validationRule.arguments.regexOptions;
        var regex = new RegExp(regexPart, regexOptionsPart);

        return regex.test(value);
      },

      maxLength: function (value, field, validationRule) {
        var limit = parseInt(validationRule.arguments.length);
        return AdpValidationUtils.maxString(value.length, limit);
      },

      minLength: function (value, field, validationRule) {
        var limit = parseInt(validationRule.arguments.length);
        return AdpValidationUtils.minString(value.length, limit);
      },

      passwordMatch: function(value, field, validationRule, formData) {
        var matchedFieldName = validationRule.arguments.matchedField;
        var matchedValue = formData[matchedFieldName];

        return value === matchedValue;
      },

      min: function(value, field, validationRule) {
        var ruleName = 'min' + field.type;
        return minMaxValidators[ruleName].apply(null, arguments);
      },

      max: function(value, field, validationRule) {
        var ruleName = 'max' + field.type;
        return minMaxValidators[ruleName].apply(null, arguments);
      },

      notInFuture: function(value, field) {
        var dates = prepareDateForComparision(value, today(), field.type);
        if (_.isNil(dates)) {
          return true;
        }

        return moment(dates.value).isSameOrBefore(dates.comparisionDate);
      },

      notInPast: function(value, field) {
        var dates = prepareDateForComparision(value, today(), field.type);
        if (_.isNil(dates)) {
          return true;
        }

        return moment(dates.value).isSameOrAfter(dates.comparisionDate);
      },
      imperialHeightRange: noopValidator,
    };

    /**
     *
     * @param value {String|Date}
     * @param comparisionDate {String|Date}
     * @param fieldType {String}
     * @return {null|{value: moment.Moment, comparisionDate: moment.Moment}}
     */
    function prepareDateForComparision(value, comparisionDate, fieldType) {
      var dates = {
        value: AdpValidationUtils.dateToMoment(new Date(value), fieldType),
        comparisionDate: AdpValidationUtils.dateToMoment(comparisionDate, fieldType),
      };

      if (!dates.value.isValid() || !dates.comparisionDate.isValid()) {
        return null;
      }

      return dates;
    }

    function today() {
      var todaySinceMidnight = new Date();
      return todaySinceMidnight.setHours(0,0,0,0);
    }
  }
})();
