;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpFormDataUtils', AdpFormDataUtils);

  function AdpFormDataUtils(
    AdpFormIteratorUtils
  ) {
    return {
      transformDataBeforeSending: transformDataBeforeSending,
      cleanFormDataAndKeepArraysPositions: cleanFormDataAndKeepArraysPositions,
    };

    function transformDataBeforeSending(formData, schema) {
      var cleanUpStrategies = {
        'Object': _cleanObjectBeforeSending,
        'Array': _cleanArrayItem,
        'AssociativeArray': _cleanAssociativeArrayItemBeforeSending,
        'AssociativeArrayRoot': _cleanAssociativeArrayRootBeforeSending,
        'ArrayRoot': _cleanArrayRootBeforeSending,
        'Schema': function (args) {
          _cleanObjectInPlace(args.formData);
        },
        'TreeSelector': _cleanTreeSelector,
        'LookupObjectID': _cleanLookup,
        'LookupObjectID[]': _cleanLookup,
        'default': _cleanPrimitiveValue,
      };

      return cleanFormData(formData, schema, cleanUpStrategies);
    }

    // using option clearEmptyOnly to keep items in positions
    // example
    // real data: { array: [{...}, {object: {...}}, {...}] }
    // cleaned copy: { array: [null, null, {}] }
    // to check if item in path 'array[2]' is empty, we need to keep empty items in its positions
    function cleanFormDataAndKeepArraysPositions(formData, schema) {
      var cleanUpStrategies = {
        'Object': _cleanObject,
        'Array': _cleanArrayItem,
        'ArrayRoot': _cleanArrayRoot,
        'AssociativeArray': _cleanAssociativeArrayItem,
        'AssociativeArrayRoot': _cleanArrayRoot,
        'Schema': function (args) {
          _cleanObjectInPlace(args.formData);
        },
        'TreeSelector': _cleanTreeSelector,
        'default': _cleanPrimitiveValue,
      };

      return cleanFormData(formData, schema, cleanUpStrategies);
    }

    function cleanFormData(formData, schema, cleanUpStrategies) {
      if (_.isNil(formData)) {
        return;
      }

      var formDataCopy = _.cloneDeep(formData);

      var cleanUpCb = function (formDataRef, currentField, path) {
        var cleanupStrategy = cleanUpStrategies[currentField.type] ||
          cleanUpStrategies.default;

        var args = getArgs(formDataRef, currentField, path);
        cleanupStrategy(args);

        // workaround: current iterator does not call cb for Array Root
        if (currentField.type === 'Array' && isLastArrayItem(args.path, formData)) {
          cleanUpStrategies.ArrayRoot(args);
        }

        if (currentField.type === 'AssociativeArray' && isLastArrayItem(args.path, formData)) {
          cleanUpStrategies.AssociativeArrayRoot(args);
        }
      };

      AdpFormIteratorUtils.traverseFormDataPostOrder(formDataCopy, schema, '', cleanUpCb);

      return formDataCopy;
    }

    function getArgs(formData, currentField, path) {
      return {
        value: _.get(formData, path, selectDefaultValue(currentField.type)),
        field: currentField,
        formData: formData,
        parentFormData: _.get(formData, _parentPath(path), formData),
        path: path,
        parentPath: _parentPath(path),
      }

      // --------------
      function selectDefaultValue(type) {
        var defaults = {
          'Object': formData,
          'Array': undefined,
        }

        return _.hasIn(type, defaults) ? defaults[type] : null;
      }
    }

    function _cleanObjectBeforeSending(args) {
      if (_.isNil(args.parentFormData)) {
        return;
      }

      _cleanObjectInPlace(args.value);

      if (!_.isEmpty(args.value)) {
        return;
      }
      var isRoot = args.parentPath === '';
      var objEmptyValue = args.field.required && isRoot ? {} : null;
      _.set(args.parentFormData, args.field.fieldName, objEmptyValue);
    }

    function _cleanObject(args) {
      if (_.isNil(args.parentFormData)) {
        return;
      }
      _cleanObjectInPlace(args.value);

      if (!_.isEmpty(args.value)) {
        return;
      }

      _.set(args.parentFormData, args.field.fieldName, null);
    }

    function _cleanArrayItem(args) {
      _.unset(args.value, '_id');
      _cleanObjectInPlace(args.value);

      if (_.isEmpty(args.value)) {
        _.set(args.formData, args.path, null);
      }
    }

    function _cleanAssociativeArrayItem(args) {
      _.unset(args.value, '_id');
      _cleanObjectInPlace(args.value);

      var isEmpty =_.isEmpty(args.value) || hasOnlyKey(args.value);
      if (isEmpty) {
        _.set(args.formData, args.path, null);
      }

      // ------------
      function hasOnlyKey(value) {
        var keys = Object.keys(value), key = keys[0];
        return keys.length === 1 && key === '$key';
      }
    }

    function _cleanAssociativeArrayItemBeforeSending(args) {
      _.unset(args.value, '_id');
      _cleanObjectInPlace(args.value);

      var isEmpty =_.isEmpty(args.value) || hasOnlyKey(args.value);
      if (!isEmpty) {
        return;
      }

      var emptyValue;
      if (args.field.required && hasOnlyKey(args.value)) {
        emptyValue = args.value;
      } else {
        emptyValue = null;
      }

      _.set(args.formData, args.path, emptyValue);

      // ------------
      function hasOnlyKey(value) {
        var keys = Object.keys(value), key = keys[0];
        return keys.length === 1 && key === '$key';
      }
    }

    function _cleanArrayRootBeforeSending(args) {
      var arrayPath = getArrayPath(args.path);
      var arrayFormData = _.get(args.formData, arrayPath);

      _.pull(arrayFormData, null);
      if (_.isEmpty(arrayFormData)) {
        var emptyValue = args.field.required ? [{}] : null;
        _.set(args.formData, arrayPath, emptyValue);
      }
    }

    function _cleanArrayRoot(args) {
      var arrayPath = getArrayPath(args.path);
      var arrayFormData = _.get(args.formData, arrayPath);

      var containsNullsOnly = _.every(arrayFormData, _.isNull);
      containsNullsOnly && _.set(args.formData, arrayPath, null);
    }

    function _cleanAssociativeArrayRootBeforeSending(args) {
      var arrayPath = getArrayPath(args.path);
      var arrayData = _.get(args.formData, arrayPath);

      _.pull(arrayData, null);

      if (_.isEmpty(arrayData)) {
        var emptyValue = args.field.required ? {} : null;
        _.set(args.formData, arrayPath, emptyValue);
      } else {
        var result = {};
        arrayData.forEach(function (item) {
          result[item.$key] = _.omit(item, ['$key']);
        });

        _.set(args.formData, arrayPath, result);
      }
    }

    function _cleanTreeSelector(args) {
      var value = _.filter(args.value, function (v) {
        return !_.isEmpty(v);
      });

      var valueToSet = value.length ? value : null;
      args.parentFormData && _.set(args.parentFormData, args.field.fieldName, valueToSet);
    }

    function _cleanLookup(args) {
      var value = args.value;
      _.isArray(value) && value.forEach(cleanSingle);
      _.isPlainObject(value) && cleanSingle(value)

      function cleanSingle(val) {
        _.unset(val, 'data');
      }
    }

    function _cleanPrimitiveValue(args) {
      var media = ['File', 'Image', 'Audio', 'Video', 'File[]', 'Image[]', 'Audio[]', 'Video[]'];
      if (_.includes(media, args.field.type) && _.isEmpty(args.value)) {
        args.parentFormData && _.set(args.parentFormData, args.field.fieldName, null);
      }

      if (_.isNil(args.value) || args.value === '') {
        args.parentFormData && _.set(args.parentFormData, args.field.fieldName, null);
      }
    }

    function _cleanObjectInPlace(object) {
      _.each(object, function (v, k) {
        _.isNull(v) && _.unset(object, k);
      });
    }

    function _parentPath(path) {
      var pathArray = path.split('.');
      var parentPathArray = _.take(pathArray, pathArray.length - 1);

      return parentPathArray.join('.');
    }

    function getArrayPath(path) {
      var indexRe = /\[\d+\]$/;

      return path.replace(indexRe, '');
    }

    function isLastArrayItem(path, formData) {
      var matches = path.match(/\[(\d+)\]$/);
      if (matches === null) {
        return false;
      }

      var index = Number(matches[1]);
      var indexRe = /\[\d+\]$/;

      var arrayPath = path.replace(indexRe, '');
      var arrayFormData = _.get(formData, arrayPath);

      return arrayFormData.length === index + 1;
    }
  }
})();
