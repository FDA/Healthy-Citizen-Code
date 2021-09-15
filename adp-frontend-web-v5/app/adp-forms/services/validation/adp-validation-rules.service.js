(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpValidationRules', AdpValidationRules);

  function AdpValidationRules(AdpValidationUtils) {
    // noop(), always valid
    function noopValidator() { return true; }

    var minMaxValidators = {
      minString: function (args) {
        var limitStr = _.get(args, 'validationRule.arguments.limit');
        var limit = parseInt(limitStr);
        return AdpValidationUtils.minString(args.data, limit);
      },

      maxString: function (args) {
        var limitStr = _.get(args, 'validationRule.arguments.limit');
        var limit = parseInt(limitStr);
        return AdpValidationUtils.maxString(args.data, limit);
      },

      minNumber: function (args) {
        var limitStr = _.get(args, 'validationRule.arguments.limit');
        var limit = parseFloat(limitStr);

        return args.data >= limit;
      },

      maxNumber: function (args) {
        var limitStr = _.get(args, 'validationRule.arguments.limit');
        var limit = parseFloat(limitStr);

        return args.data <= limit;
      },

      minDate: function (args) {
        var dates = prepareDateForComparison(args);
        if (_.isNil(dates)) {
          return true;
        }

        return dayjs(dates.value).isSameOrAfter(dates.comparisonDate, 'day');
      },

      maxDate: function (args) {
        var dates = prepareDateForComparison(args);
        if (_.isNil(dates)) {
          return true;
        }

        return dayjs(dates.value).isSameOrBefore(dates.comparisonDate, 'day');
      },

      minTime: function (args) {
        var dates = prepareDateForComparison(args);
        if (_.isNil(dates)) {
          return true;
        }

        var lhs = AdpValidationUtils.getMinutesOfDay(dates.value);
        var rhs = AdpValidationUtils.getMinutesOfDay(dates.comparisonDate);

        return lhs >= rhs;
      },

      maxTime: function (args) {
        var dates = prepareDateForComparison(args);
        if (_.isNil(dates)) {
          return true;
        }

        var lhs = AdpValidationUtils.getMinutesOfDay(dates.value);
        var rhs = AdpValidationUtils.getMinutesOfDay(dates.comparisonDate);

        return lhs <= rhs;
      },

      minDateTime: function (args) {
        var dates = prepareDateForComparison(args);
        if (_.isNil(dates)) {
          return true;
        }

        return dayjs(dates.value).isSameOrAfter(dates.comparisonDate);
      },

      maxDateTime: function (args) {
        var dates = prepareDateForComparison(args);
        if (_.isNil(dates)) {
          return true;
        }

        return dates.value.isSameOrBefore(dates.comparisonDate);
      },
      minImperialHeight: noopValidator,
      minImperialWeightWithOz: noopValidator,
      minImperialWeight: noopValidator,
      maxImperialHeight: noopValidator,
      maxImperialWeightWithOz: noopValidator,
      maxImperialWeight: noopValidator,
      boolean: noopValidator,
      triStateBoolean: noopValidator,
    };

    function validateNumberRange(args) {
      var isMultiple = args.fieldSchema.type.includes('[]');
      var range = selectRange(args.validationRule);

      return isMultiple ?
        validateNumberRangeMultiple(args.data, range) :
        validateNumberRangeSingle(args.data, range);
    }

    function selectRange(validationRule) {
      return ({
        int32: { begin: 0x7fffffff, end: -0x80000000 },
        int64: { begin: Number.MIN_SAFE_INTEGER, end: Number.MAX_SAFE_INTEGER },
      })[validationRule.validator];
    }

    function validateNumberRangeSingle(value, range) {
      var num = Number(value);
      return _.inRange(num, range.begin, range.end);
    }

    function validateNumberRangeMultiple(value, range) {
      var inRangeValues = value.filter(function (v) {
        return validateNumberRangeSingle(v, range);
      });

      return value.length === inRangeValues.length;
    }

    return {
      regex: function (args) {
        var regexPart = _.get(args, 'validationRule.arguments.regex');
        var regexOptionsPart = _.get(args, 'validationRule.arguments.regexOptions');
        var regex = new RegExp(regexPart, regexOptionsPart);

        return regex.test(args.data);
      },

      maxLength: function (args) {
        var limit = parseInt(args.validationRule.arguments.length);
        return AdpValidationUtils.maxString(args.data.length, limit);
      },

      minLength: function (args) {
        var limit = parseInt(args.validationRule.arguments.length);
        return AdpValidationUtils.minString(args.data.length, limit);
      },

      passwordMatch: function(args) {
        var matchedFieldName = args.validationRule.arguments.matchedField;
        var matchedValue = args.formData[matchedFieldName];

        return args.data === matchedValue;
      },

      min: function(args) {
        var ruleName = 'min' + args.fieldSchema.type;
        return minMaxValidators[ruleName].apply(null, arguments);
      },

      max: function(args) {
        var ruleName = 'max' + args.fieldSchema.type;
        return minMaxValidators[ruleName].apply(null, arguments);
      },

      notInFuture: function(args) {
        var dates = prepareDateForComparison(args, today());
        if (_.isNil(dates)) {
          return true;
        }

        return dayjs(dates.value).isSameOrBefore(dates.comparisonDate);
      },

      notInPast: function(args) {
        var dates = prepareDateForComparison(args, today());
        if (_.isNil(dates)) {
          return true;
        }

        return dayjs(dates.value).isSameOrAfter(dates.comparisonDate);
      },
      int32: validateNumberRange,
      int64: validateNumberRange,
      imperialHeightRange: noopValidator,
      decimal128: noopValidator,
    };

    /**
     * @return {null|{value: dayjs.dayjs, comparisonDate: String}}
     */
    function prepareDateForComparison(args, comparisonDate) {
      var format = AdpValidationUtils.getDateFormat(args.fieldSchema.type);
      var limitDate = comparisonDate ?
        dayjs(comparisonDate) :
        dayjs(args.validationRule.arguments.limit, format);

      var dates = {
        value: dayjs(args.data).startOf('minute'),
        comparisonDate: limitDate.startOf('minute'),
      };

      if (!dates.value.isValid() || !dates.comparisonDate.isValid()) {
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
