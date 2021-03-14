;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpValidationUtils', AdpValidationUtils);

  function AdpValidationUtils(
    DATE_FORMAT,
    DATE_TIME_FORMAT,
    TIME_FORMAT
  ) {
    var dateFormats = {
      Date: DATE_FORMAT,
      DateTime: DATE_TIME_FORMAT,
      Time: TIME_FORMAT,
    };

    return {
      getMinutesOfDay: getMinutesOfDay,
      minString: minString,
      maxString: maxString,
      isValidDate: isValidDate,
      getDateFormat: getDateFormat,
      formatDate: formatDate,
      isRequired: isRequired,
      getRequiredFn: getRequiredFn,
    }

    function getMinutesOfDay(m) {
      return m.minute() + m.hour() * 60;
    }

    function minString(length, limit) {
      return length >= limit;
    }

    function maxString(length, limit) {
      return length <= limit;
    }

    function isValidDate(value, type) {
      var dateFormat = getDateFormat(type);

      return dayjs(value, dateFormat).isValid();
    }

    function getDateFormat(type) {
      return dateFormats[type];
    }

    function formatDate(value, field) {
      var format = getDateFormat(field.type);
      var dayjsInstance = typeof value === 'string' ?
        dayjs(value, format) : dayjs(value);

      return dayjsInstance.format(format);
    }

    function isRequired(path, requiredMap) {
      return function () {
        return requiredMap[path] || false;
      }
    }

    function getRequiredFn(args) {
      var requiredRule = args.fieldSchema.required;

      if (_.isString(requiredRule)) {
        return _createConditionalRequiredFn(args);
      } else {
        return function () {
          return !!requiredRule;
        };
      }
    }

    function _createConditionalRequiredFn(args) {
      return new Function('data, row, modelSchema, $action',
        'return ' + args.fieldSchema.required
      ).bind(args, args.data, args.row, args.modelSchema, args.action);
    }
  }
})();
