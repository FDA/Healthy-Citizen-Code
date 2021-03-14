;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpQueryParams', AdpQueryParams);

  function AdpQueryParams(
    AdpFieldsService,
    AdpListsService,
    AdpValidationUtils
  ) {
    var typeResolvers = {
      'String': _string,
      'String[]': _string,
      'Text': _string,
      'Email': _string,
      'Phone': _string,
      'List[]': _list,
      'List': _list,
      'Number': function (item) {
        var parsed = Number(item);

        return _.isNaN(parsed) ? null : parsed;
      },
      'Boolean': function (item) {
        if (item === '1' || item === 'true') {
          return true;
        } else if (item === '0' || item === 'false') {
          return false;
        } else {
          return null;
        }
      },
      'Date': _date,
      'DateTime': _date,
      'Time': _date,
      'ImperialHeight': _imperialUnit,
      'ImperialWeight': function (item, field) {
        var val = _imperialUnit(item, field);
        return _.isNil(val) ? val : val[0];
      },
      'ImperialWeightWithOz': _imperialUnit
    };

    function _string(item, field) {
      return field.list ? _list(item, field) : item;
    }

    function _list(item, field) {
      var values = AdpListsService.getListValueByLabel(item, field.list);
      if (_.isEmpty(values)) {
        return null;
      }

      return _.endsWith(field.type, '[]') ? values : values[0];
    }

    function _date(item, field) {
      var dateFormat = AdpValidationUtils.getDateFormat(field.type);

      if (AdpValidationUtils.isValidDate(item, field.type)) {
        return dayjs(item, dateFormat).toDate();
      } else {
        return null;
      }
    }

    function _imperialUnit(item, field) {
      var value = item.split('.').map(Number);

      var isValidNumbers = !value.includes(NaN);
      if (!isValidNumbers) {
        return null;
      }

      var units = AdpFieldsService.getUnits(field);
      var firstNotInRange = !_.inRange(value[0], 0, units[0].range[1]);

      if (firstNotInRange) {
        return null;
      }

      if (value[1])  {
        if (_.isUndefined(units[1])) {
          return null;
        }
        var secondNotInRange = !_.inRange(value[1], 0, units[1].range[1]);

        if (secondNotInRange) {
          return null;
        }
      }

      return value;
    }

    function _filterQueryData(schema, data) {
      var typeDefinition = [
        'String',
        'String[]',
        'Boolean',
        'Number',
        'Date',
        'DateTime',
        'Time',
        'ImperialHeight',
        'ImperialWeight',
        'ImperialWeightWithOz',
        'Text',
        'Email',
        'Phone',
        'List',
        'List[]'
      ];

      var skip = function (field, key) {
        if (_.isUndefined(field)) {
          return true;
        }

        if (key === 'action') {
          return true;
        }

        // TODO: add permissions check
        if (!_isVisible(field)) {
          return true;
        }

        var exlusions = ['Password', 'PasswordAuth'];
        var exclude = field.type && exlusions.includes(field.type);

        if (exclude) {
          return false;
        }

        return false;
      };

      var result = {};

      _.each(data,function (item, key) {
        var path = _keyToSchemaPath(key);
        var field = _.get(schema.fields, path);

        if (skip(field, key)) {
          return;
        }

        if (typeDefinition.includes(field.type)) {
          result[key] = item;
        }
      });

      return result;
    }

    function _parseQueryParams(data, schema) {
      return _.mapValues(data, function (item, key) {
        var path = _keyToSchemaPath(key);
        var field = _.get(schema.fields, path);

        return _parseByType(item, field);
      });
    }

    function _keyToSchemaPath(key) {
      return key.replace(/\[.+\]/, '').split('.').join('.fields.')
    }

    function _parseByType(value, field) {
      var resolvedValue = _resolveArrayValue(value, field);
      var conversionFn = typeResolvers[field.subtype] || typeResolvers[field.type];

      if (_.isUndefined(conversionFn)) {
        return resolvedValue;
      } else {
        return conversionFn(resolvedValue, field);
      }
    }

    function _resolveArrayValue(value, field) {
      var typeOfArray = field.type.includes('[]');

      if (typeOfArray && !_.isArray(value)) {
        return [value];
      }

      if (!typeOfArray && _.isArray(value)) {
        return value[0];
      }

      return value;
    }

    function _isVisible(field) {
      return 'showInForm' in field ?
        field.showInForm : field.visible;
    }

    function getDataFromQueryParams(schema, dataFromQuery) {
      var parsedData = _filterQueryData(schema, dataFromQuery);
      parsedData = _parseQueryParams(parsedData, schema);

      if (_.isEmpty(parsedData)) {
        return;
      }

      var result = {};
      _.each(parsedData, function (item, key) {
        _.set(result, key, item);
      });

      return result;
    }

    return {
      getDataFromQueryParams: getDataFromQueryParams
    };
  }
})();
