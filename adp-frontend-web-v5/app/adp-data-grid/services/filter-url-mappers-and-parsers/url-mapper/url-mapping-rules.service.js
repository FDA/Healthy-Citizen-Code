;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('urlMappingRules', urlMappingRules);

  /** @ngInject */
  function urlMappingRules(
    BOOLEAN_FILTER_VALUES,
    AdpValidationUtils
  ) {
    // REFACTOR: apply same pattern as to transformers
    // REFACTOR: for [filter.fieldName, filter.value] filter.fieldName to reusable function and map with function value only
    function getRangeValue(values, fieldName) {
      var result = [];
      if (!_.isNil(values[0])) {
        result.push([fieldName + 'From', values[0]].join('='));
      }

      if (!_.isNil(values[1])) {
        result.push(([fieldName + 'To', values[1]].join('=')));
      }

      return result.join('&');
    }

    function numberMapper(filter) {
      if (filter.operation === 'between') {
        return getRangeValue(filter.value, filter.fieldName);
      } else {
        return [filter.fieldName, filter.value].join('=');
      }
    }

    function datetimeMapper(filter) {
      if (filter.operation === 'between') {
        return getRangeValue(filter.value, filter.fieldName);
      } else {
        return [filter.fieldName, moment(filter.value).format(AdpValidationUtils.getDateFormat(filter.field.type))].join('=');
      }
    }

    function listMapper(filter) {
      var list = filter.field.list;
      // TEMP: until solution to set async values found
      if (_.isNil(list)) {
        return null;
      }

      return _.map(filter.value, function (listKey) {
        var listLabel = list[listKey];
        return [filter.fieldName, listLabel].join('=');
      }).join('&');
    }

    function mapToImperialUnitMultiplePositions(filter) {
      if (filter.operation === 'between') {
        // temp workaround, when switching from any operation with filterValue
        // dx triggers change with wrong value
        // just skip and proceed with correct value
        if (_.isString(filter.value)) {
          return '';
        }

        var val = filter.value.map(function (v) {
          return _.isString(v) ? v : null;
        });

        return getRangeValue(val, filter.fieldName);
      } else {
        return [filter.fieldName, filter.value].join('=');
      }
    }

    return {
      string: function (filter) {
        return [filter.fieldName, filter.value].join('=');
      },
      list: listMapper,
      dynamicList: listMapper,
      boolean: function (filter) {
        var valueMap = {};
        valueMap[BOOLEAN_FILTER_VALUES.TRUE] = 'true';
        valueMap[BOOLEAN_FILTER_VALUES.FALSE] = 'false';

        var filterValueToSet = valueMap[filter.value];
        return [filter.fieldName, filterValueToSet].join('=');
      },
      currency: numberMapper,
      number: numberMapper,
      date: datetimeMapper,
      time: datetimeMapper,
      dateTime: datetimeMapper,
      imperialWeight: numberMapper,
      imperialWeightWithOz: mapToImperialUnitMultiplePositions,
      imperialHeight: mapToImperialUnitMultiplePositions,
      lookupObjectId: function (filter) {
        var fieldName = filter.field.fieldName;
        return filter.value.reduce(function (result, lookup) {
          result.push([fieldName + 'Table', lookup.table].join('='));
          result.push([fieldName + 'Id', lookup._id].join('='));
          result.push([fieldName + 'Label', lookup.label].join('='));

          return result;
        }, []).join('&');
      },
    };
  }
})();
