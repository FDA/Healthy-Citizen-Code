;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpValidationUtils', AdpValidationUtils);

  function AdpValidationUtils(
    DATE_FORMAT,
    DATE_TIME_FORMAT,
    TIME_FORMAT,
    AdpUnifiedArgs,
    AdpPath
  ) {
    var dateFormats = {
      Date: DATE_FORMAT,
      DateTime: DATE_TIME_FORMAT,
      Time: TIME_FORMAT,
    };

    return {
      formatDatesBeforeComparision: formatDatesBeforeComparision,
      getMinutesOfDay: getMinutesOfDay,
      minString: minString,
      maxString: maxString,
      isValidDate: isValidDate,
      getDateFormat: getDateFormat,
      formatDate: formatDate,
      isRequired: isRequired,
      getRequiredFn: getRequiredFn,
    }

    function formatDatesBeforeComparision(date, comparisionDate, fieldType) {
      var format = getDateFormat(fieldType);

      var result = {
        value: moment(date, format),
        comparisionDate: moment(comparisionDate, format),
      }

      var hasInvalid = !!_.find(result, function (d) {
        return !d.isValid();
      });

      return hasInvalid ? null : result;
    }

    function getMinutesOfDay(m) {
      return m.minutes() + m.hours() * 60;
    }

    function minString(length, limit) {
      return length >= limit;
    }

    function maxString(length, limit) {
      return length <= limit;
    }

    function isValidDate(value, type) {
      var dateFormat = getDateFormat(type);

      var formats = [
        moment.ISO_8601,
        dateFormat
      ];

      var d = moment(value, formats, true);
      return d.isValid();
    }

    function getDateFormat(type) {
      return dateFormats[type];
    }

    function formatDate(value, field) {
      var format = getDateFormat(field.type);
      return moment(value, format).format(format);
    }

    function isRequired(formParams) {
      return function () {
        var path = formParams.path;
        return formParams.requiredMap[path] || false;
      }
    }

    function getRequiredFn(formParams) {
      var schemaPath = AdpPath.schemaPath(formParams.path);
      var field = _.get(formParams.modelSchema.fields, schemaPath);

      if (_.isString(field.required)) {
        return _createConditionalRequiredFn(formParams);
      } else {
        return function () {
          return !!field.required;
        };
      }
    }

    function _createConditionalRequiredFn(formParams) {
      var params = AdpUnifiedArgs.getHelperParamsWithConfig({
        path: formParams.path,
        action: formParams.action,
        formData: formParams.row,
        schema: formParams.modelSchema,
      });

      // DEPRECATED: do not use - non context arguments will be removed
      var schemaPath = AdpPath.schemaPath(formParams.path);
      var field = _.get(formParams.modelSchema.fields, schemaPath);
      var data = _.get(formParams.row, formParams.path);
      var row = formParams.row;
      var modelSchema = formParams.modelSchema;
      var $action = formParams.action;

      // fieldValue, formData, rootSchema, $action
      var requiredFunc = new Function(
        'data, row, modelSchema, $action',
        'return ' + field.required
      ).bind(params, data, row, modelSchema, $action);

      return requiredFunc;
    }
  }
})();
