;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpQueryParams', AdpQueryParams);

  function AdpQueryParams(
    AdpFieldsService,
    AdpValidationService
  ) {
    var typeResolvers = {
      'String': function (item, field) {
        var hasList = !_.isUndefined(field.list);
        if (hasList) {
          return AdpFieldsService.getValidListValues([item], field);
        }

        return item;
      },
      'String[]': function (items, field) {
        var hasList = !_.isUndefined(field.list);
        if (hasList) {
          return AdpFieldsService.getValidListValues(items, field);
        }

        return items;
      },
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
      'Date': function (item, field) {
        var dateFormat = AdpValidationService.getDateFormat(field.subtype);

        if (AdpValidationService.isValidDate(item, field.subtype)) {
          return moment(item, dateFormat).toDate();
        } else {
          return null;
        }
      },
      'ImperialHeight': _imperialUnit,
      'ImperialWeight': _imperialUnit,
      'ImperialWeightWithOz': _imperialUnit
    };

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
        'Date'
      ];

      var skip = function (field, key) {
        if (_.isUndefined(field)) {
          return true;
        }

        if (['action', '_id'].includes(key)) {
          return true;
        }

        // TODO: add permissions check
        if (!_isVisible(field)) {
          return true;
        }

        var exlusions = ['Password', 'PasswordAuth'];
        var exclude = field.subtype && exlusions.includes(field.subtype);

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

    function setDataFromQueryParams(formData, schema, dataFromQuery) {
      var parsedData = _filterQueryData(schema, dataFromQuery);
      parsedData = _parseQueryParams(parsedData, schema);

      if (_.isEmpty(parsedData)) {
        return;
      }

      _.each(parsedData, function (item, key) {
        _.set(formData, key, item);
      });
    }

    return {
      setDataFromQueryParams: setDataFromQueryParams
    };
  }
})();