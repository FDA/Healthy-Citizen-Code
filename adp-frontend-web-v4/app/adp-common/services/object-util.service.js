;(function() {
  'use strict';

  angular
    .module('app.adpCommon')
    .factory('ObjectUtil', ObjectUtil);

  function ObjectUtil() {
    return {
      cleanDeep: cleanDeep,
      toHTML: toHTML
    };
  }

  var cleanDeepDefaults = {
    emptyArrays: true,
    emptyObjects: true,
    emptyStrings: true,
    nullValues: true,
    undefinedValues: true,
    omitFields: []
  };

  function cleanDeep(object, opts) {
    var opts = opts || {};
    var options = _.defaults(opts, cleanDeepDefaults);

    return _.transform(object, function(result, value, key) {
      if (options.omitFields.includes(key)) {
        return;
      }

      // Recurse into arrays and objects.
      if (Array.isArray(value) || _.isPlainObject(value)) {
        value = cleanDeep(value, options);
      }

      // Exclude empty objects.
      if (options.emptyObjects && _.isPlainObject(value) && _.isEmpty(value)) {
        return;
      }

      // Exclude empty arrays.
      if (options.emptyArrays && Array.isArray(value) && !value.length) {
        return;
      }

      // Exclude empty strings.
      if (options.emptyStrings && value === '') {
        return;
      }

      // Exclude null values.
      if (options.nullValues && value === null) {
        return;
      }

      // Exclude undefined values.
      if (options.undefinedValues && value === undefined) {
        return;
      }

      // Append when recursing arrays.
      if (Array.isArray(result)) {
        return result.push(value);
      }

      result[key] = value;
    });
  }

  function toHTML(obj, schema) {
    var result = '';

    if (_.isArray(obj)) {
      result = _convertArray(obj, schema);
    } else if (_.isObject(obj)) {
      result = _convertObjectList(obj, schema);
    } else {
      throw new Error('Unknown complex type field');
    }

    return '<div class="yaml">' + result + '</div>';
  }

  function _convertArray(obj, schema, result) {
    var result = result || '';

    _.each(obj, function (prop) {
      var currentResult = _convertObjectList(prop, schema);
      currentResult = '<li class="array-item">' + currentResult + '</li>';

      result += currentResult;
    });

    return '<ul class="array-list">' + result + '</ul>';
  }

  function _valueItem(key, value) {
    return [
      '<li class="object-item list-unstyled">',
        '<div class="complex-type">',
          '<div class="complex-type-key">',
              key + ': ',
          '</div>',
          '<div class="complex-type-value">',
            value,
          '</div>',
        '</div>',
      '</li>'
    ].join('');
  }

  function _objectChild(key, value) {
    return [
      '<li class="object-item list-unstyled">',
        key + ': ' + value,
      '</li>'
    ].join('');
  }

  function _convertObjectList(obj, schema, result) {
    var result = result || '';

    _.each(obj, function (prop, key) {
      var currentSchema = schema.fields[key];
      var value;

      if (_.isArray(prop)) {
        value = _convertArray(prop, currentSchema, result);
        result += _objectChild(key, value)
      } else if (_.isObject(prop)) {
        value = _convertObjectList(prop, currentSchema, result);
        result += _objectChild(key, value)
      } else {
        result += _valueItem(key, prop);
      }
    });

    result = '<ul class="object-list">' + result + '</ul>';

    return result;
  }

})();

