;(function() {
  'use strict';

  angular
    .module('app.adpCommon')
    .factory('ObjectUtil', ObjectUtil);

  function ObjectUtil() {
    return {
      cleanDeep: cleanDeep
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
})();

