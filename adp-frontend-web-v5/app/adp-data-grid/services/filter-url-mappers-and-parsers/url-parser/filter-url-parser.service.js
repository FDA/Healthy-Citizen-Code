;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('FilterUrlParser', FilterUrlParser);

  /** @ngInject */
  function FilterUrlParser(
    GridFilterHelpers,
    AdpFieldsService,
    AdpSchemaService,
    FilterOperation,
    $state,
    transformFilterValueFromUrl
  ) {
    return function (schema) {
      var parsedFilters = parseFilterFromUrl();
      return transformToFilters(parsedFilters, schema);
    };

    function parseFilterFromUrl() {
      var decodedFilterKeyValPairs = (decodeURIComponent($state.params.filter) || '').split('&');
      var result = {};

      _.each(decodedFilterKeyValPairs, function (keyVal) {
        var keyValPair = keyVal.split('=');
        var key = keyValPair[0];
        var val = keyValPair[1];

        if (_.isNil(val)) {
          return;
        }

        var current = result[key];
        if (_.isNil(current)) {
          result[key] = val;
        } else {
          if (!_.isArray(current)) {
            result[key] = [current];
          }
          result[key].push(val);
        }
      });

      return result;
    }

    function transformToFilters(parsedFilters, schema) {
      var result = {};

      _.each(schema.fields, function (field) {
        if (!field.showInDatatable) {
          return;
        }

        var fieldName = field.fieldName;
        var operation = parseAndValidateOperation(parsedFilters[fieldName + 'Operation'], field);
        var filterValue = getFilterValue(parsedFilters, operation, field);

        if (!filterValue) {
          return;
        }

        var transformedValue = transformFilterValueFromUrl(filterValue, operation, field);
        if (_.isNil(transformedValue)) {
          return;
        }

        result[fieldName] = { value: transformedValue };

        if (!_.isNil(operation)) {
          result[fieldName].operation = operation;
        }
      });

      return result;
    }

    function getFilterValue(filters, operation, field) {
      var fieldName = field.fieldName;

      if (operation === 'between') {
        return getRangeValue(filters, fieldName);
      } else if (AdpSchemaService.isLookup(field.type)) {
        return getLookupValue(filters, fieldName);
      } else {
        return getSingleValue(filters, field);
      }
    }

    function getRangeValue(filters, fieldName) {
      var result = [undefined, undefined];

      var rangeStart = unwrapArray(filters[fieldName + 'From']);
      rangeStart && (result[0] = rangeStart);

      var rangeEnd = unwrapArray(filters[fieldName + 'To']);
      rangeEnd && (result[1] = rangeEnd);

      return result;
    }

    function getSingleValue(filters, field) {
      var value = filters[field.fieldName];

      if (arrayExpected(field)) {
        return wrapArray(value);
      } else {
        return unwrapArray(value);
      }
    }

    function getLookupValue(filters, fieldName) {
      var tables = wrapArray(filters[fieldName + 'Table']);
      var ids = wrapArray(filters[fieldName + 'Id']);
      var labels = wrapArray(filters[fieldName + 'Label']);

      return tables.map(function (table, index) {
        return {
          table: table,
          _id: ids[index],
          label: labels[index],
        }
      });
    }

    function arrayExpected(field) {
      if (field.list) {
        return true;
      }

      return false;
    }

    function unwrapArray(value) {
      if (_.isArray(value)) {
        return _.first(value);
      }

      return value;
    }

    function wrapArray(value) {
      if (_.isArray(value)) {
        return value;
      }

      return [value];
    }

    function parseAndValidateOperation(operation, field) {
      if (!operation) {
        return null;
      }
      var decodedOperation = FilterOperation.decode(operation);

      return FilterOperation.getValidOperation(decodedOperation, field);
    }
  }
})();
