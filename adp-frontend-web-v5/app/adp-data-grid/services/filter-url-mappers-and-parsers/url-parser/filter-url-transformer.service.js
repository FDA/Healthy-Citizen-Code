;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('transformFilterValueFromUrl', transformFilterValueFromUrl);

  /** @ngInject */
  function transformFilterValueFromUrl(
    BOOLEAN_FILTER_VALUES,
    GridFilterHelpers,
    AdpFieldsService,
    AdpListsService,
    AdpValidationUtils
  ) {
    var transformers = {
      currency: [transformToNumber],
      number: [transformToNumber],
      date: [transformToDate],
      time: [transformToDate],
      dateTime: [transformToDate],
      imperialWeight: [
        transformToNumber,
        function (value, field) {
          var units = AdpFieldsService.getUnits(field);
          if (!isValidForRange(value, units[0].range)) {
            return null;
          }

          return value;
        }
      ],
      string: [transformToString],
      objectId: [transformToString],
      boolean: [transformToBoolean],
      triStateBoolean: [transformToBoolean],
      list: [transformToList],
      dynamicList: [transformToList],
      imperialHeight: [
        transformToImperialUnitMultiplePositions,
        validateRangeImperialUnitMultiplePositions,
      ],
      imperialWeightWithOz: [
        transformToImperialUnitMultiplePositions,
        validateRangeImperialUnitMultiplePositions,
      ],
      lookupObjectId: [validateLookupValues],
    };

    return function (value, operation, field) {
      if (operation === 'between') {
        var result = value.map(function (val) {
          return runTransformersPipe(val, field);
        });

        return _.compact(result).length === 0 ? null : result;
      } else {
        return runTransformersPipe(value, field);
      }
    };

    function runTransformersPipe(value, field) {
      var transformers = getTransformers(field);

      var transformedValue = value;
      for (var i = 0; i < transformers.length; i++) {
        transformedValue = transformers[i](transformedValue, field);

        if (_.isNil(transformedValue)) {
          return null;
        }
      }

      return transformedValue
    }

    function getTransformers(field) {
      var filterRenderer = GridFilterHelpers.getFilterRenderer(field);
      if (!filterRenderer) {
        return [];
      }
      return transformers[filterRenderer.value] || [];
    }

    function transformToNumber(value) {
      var result = Number(value);
      return _.isNaN(result) ? null : result;
    }

    function transformToList(value, field) {
      var valuesByLabel = AdpListsService.getListValueByLabel(value, field.list);
      return valuesByLabel.length === 0 ? null : valuesByLabel;
    }

    function transformToDate(value, field) {
      var format = AdpValidationUtils.getDateFormat(field.type);
      var result = dayjs(value, format).toDate();

      return !result.getTime() ? null : result;
    }

    function isValidForRange(value, range) {
      // TODO: should set from service
      // filter zero value is allowed
      var begin = 0;
      var end = range[1];

      return value >= begin && value <= end;
    }

    function transformToImperialUnitMultiplePositions(value) {
      var result = (value || '').split('.').map(transformToNumber);
      var filtered = _.filter(result, _.isNumber);
      var atLeastOneInvalid = filtered.length !== 2;

      return atLeastOneInvalid ? null : value;
    }

    function validateRangeImperialUnitMultiplePositions(value, field) {
      var units = AdpFieldsService.getUnits(field);
      var valueAsNumbers = value.split('.');

      var filtered = units.filter(function (unit, index) {
        return isValidForRange(valueAsNumbers[index], unit.range);
      });

      return filtered.length === 2 ? value : null;
    }

    function transformToBoolean(value) {
      var allowedTruthyValues = ['1', 'true'];
      var allowedFalsyValue = ['0', 'false'];

      if (allowedTruthyValues.includes(value)) {
        return BOOLEAN_FILTER_VALUES.TRUE;
      } else if (allowedFalsyValue.includes(value)) {
        return BOOLEAN_FILTER_VALUES.FALSE;
      } else {
        return null;
      }
    }

    function transformToString(value) {
      return !!value ? value : null;
    }

    function validateLookupValues(value, field) {
      var ID_REGEX = /^[a-f\d]{24}$/i;

      var results = [];
      value.forEach(function (lookup) {
        if (!ID_REGEX.test(lookup._id)) {
          return;
        }

        if (invalidTable(lookup.table, field)){
          return;
        }

        if (!lookup.label) {
          return;
        }

        results.push(lookup);
      });

      return results.length > 0 ? results : null;
    }

    function invalidTable(table, field) {
      var tableNames = Object.keys(field.lookup.table);

      return !tableNames.includes(table);
    }
  }
})();
