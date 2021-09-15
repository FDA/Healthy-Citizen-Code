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

    function transformDataBeforeSending(rootArgs) {
      var cleanUpStrategies = {
        'Object': _cleanObjectBeforeSending,
        'Array': _cleanArrayItem,
        'AssociativeArray': _cleanAssociativeArrayItemBeforeSending,
        'AssociativeArrayRoot': _cleanAssociativeArrayRootBeforeSending,
        'ArrayRoot': _cleanArrayRootBeforeSending,
        'Schema': _cleanObjectInPlace,
        'TreeSelector': _cleanTreeSelectorBeforeSending,
        'LookupObjectID': _cleanLookup,
        'LookupObjectID[]': _cleanLookup,
        'default': _cleanPrimitiveValue,
      };

      return cleanFormData(rootArgs, cleanUpStrategies);
    }

    // using option clearEmptyOnly to keep items in positions
    // example
    // real data: { array: [{...}, {object: {...}}, {...}] }
    // cleaned copy: { array: [null, null, {}] }
    // to check if item in path 'array[2]' is empty, we need to keep empty items in its positions
    function cleanFormDataAndKeepArraysPositions(rootArgs) {
      var cleanUpStrategies = {
        'Object': _cleanObject,
        'Array': _cleanArrayItem,
        'ArrayRoot': _cleanArrayRoot,
        'AssociativeArray': _cleanAssociativeArrayItem,
        'AssociativeArrayRoot': _cleanArrayRoot,
        'Schema': _cleanObjectInPlace,
        'TreeSelector': _cleanTreeSelector,
        'default': _cleanPrimitiveValue,
      };

      return cleanFormData(rootArgs, cleanUpStrategies);
    }

    function cleanFormData(rootArgs, cleanUpStrategies) {
      if (_.isNil(rootArgs.row)) {
        return;
      }

      var rootArgsCopy = _.assign({}, rootArgs, { row: _.cloneDeep(rootArgs.row) });

      var cleanUpCb = function (currArgs, isArrayRoot) {
        var type = currArgs.fieldSchema.type;
        var cleanupStrategy = cleanUpStrategies[type] || cleanUpStrategies.default;

        if (isArrayRoot) {
          var method = type + 'Root';
          cleanUpStrategies[method](currArgs);
        } else {
          cleanupStrategy(currArgs);
        }
      };

      AdpFormIteratorUtils.traverseFormDataPostOrder(rootArgsCopy, cleanUpCb);

      return rootArgsCopy;
    }

    function _cleanObjectBeforeSending(args) {
      if (_.isNil(args.parentData)) {
        return;
      }

      _cleanObjectInPlace(args);

      if (!_.isEmpty(args.data)) {
        return;
      }

      var objEmptyValue = args.fieldSchema.required ? {} : null;
      _.set(args.row, args.path, objEmptyValue);
    }

    function _cleanObject(args) {
      if (_.isNil(args.parentData)) {
        return;
      }

      _cleanObjectInPlace(args);

      if (!_.isEmpty(args.data)) {
        return;
      }

      _.set(args.row, args.path, null);
    }

    function _cleanArrayItem(args) {
      _.unset(args.row, args.path + '._id');
      _cleanObjectInPlace(args);

      if (_.isEmpty(args.data)) {
        _.set(args.row, args.path, null)
      }
    }

    function _cleanAssociativeArrayItem(args) {
      _.unset(args.row, args.path + '._id');
      _cleanObjectInPlace(args);

      var isEmpty =_.isEmpty(args.data) || hasOnlyKey(args.data);
      isEmpty && _.set(args.row, args.path, null);

      // ------------
      function hasOnlyKey(value) {
        var keys = Object.keys(value), key = keys[0];
        return keys.length === 1 && key === '$key';
      }
    }

    function _cleanAssociativeArrayItemBeforeSending(args) {
      _.unset(args.row, args.path + '._id');
      _cleanObjectInPlace(args);

      var isEmpty =_.isEmpty(args.data) || hasOnlyKey(args.data);
      if (!isEmpty) {
        return;
      }

      var emptyValue = args.fieldSchema.required && hasOnlyKey(args.data) ? args.data : null;
      _.set(args.row, args.path, emptyValue);

      // ------------
      function hasOnlyKey(value) {
        var keys = Object.keys(value), key = keys[0];
        return keys.length === 1 && key === '$key';
      }
    }

    function _cleanArrayRootBeforeSending(args) {
      var arrayPath = getArrayPath(args.path);
      var arrayFormData = _.get(args.row, arrayPath);
      _.pull(arrayFormData, null);

      if (_.isEmpty(arrayFormData)) {
        var emptyValue = args.fieldSchema.required ? [{}] : null;
        _.set(args.row, arrayPath, emptyValue);
      }
    }

    function _cleanArrayRoot(args) {
      var arrayPath = getArrayPath(args.path);
      var arrayFormData = _.get(args.row, arrayPath);

      var containsNullsOnly = _.every(arrayFormData, _.isNull);
      containsNullsOnly && _.set(args.row, arrayPath, null);
    }

    function _cleanAssociativeArrayRootBeforeSending(args) {
      var arrayPath = getArrayPath(args.path);
      var arrayData = _.get(args.row, arrayPath);
      _.pull(arrayData, null);

      if (_.isEmpty(arrayData)) {
        var emptyValue = args.fieldSchema.required ? {} : null;
        _.set(args.row, arrayPath, emptyValue);
      } else {
        var result = {};
        _.each(arrayData, function (item, key) {
          var itemKey = item.$key || key;
          result[itemKey] = _.omit(item, ['$key']);
        });

        _.set(args.row, arrayPath, result);
      }
    }

    function _cleanTreeSelectorBeforeSending(args) {
      var value = _.filter(args.data, function (v) {
        return !_.isEmpty(v);
      });

      var valueToSet = value.length ? value : null;
      args.parentData && _.set(args.row, args.path, valueToSet);
    }

    function _cleanTreeSelector(args) {
      var valueToSet = _.last(args.data).isLeaf ? args.data : null;
      args.parentData && _.set(args.row, args.path, valueToSet);
    }

    function _cleanLookup(args) {
      var value = args.data;
      var cleanSingle = _.partialRight(_.unset, 'data');
      _.isArray(value) && value.forEach(cleanSingle);
      _.isPlainObject(value) && cleanSingle(value);
    }

    function _cleanPrimitiveValue(args) {
      var mediaTypes = ['File', 'Image', 'Audio', 'Video', 'File[]', 'Image[]', 'Audio[]', 'Video[]'];
      var isMedia = _.includes(mediaTypes, args.fieldSchema.type);

      var isEmpty = isMedia ?
        _.isEmpty(args.data) :
        _.isNil(args.data) || args.data === '';

      (isEmpty && args.parentData) && _.set(args.row, args.path, null);
    }

    function _cleanObjectInPlace(args) {
      var object = _.get(args.row, args.path, args.row);

      _.each(object, function (v, k) {
        _.isNull(v) && _.unset(object, k);
      });
    }

    function getArrayPath(path) {
      var indexRe = /\[\d+\]$/;
      return path.replace(indexRe, '');
    }

    function isLastArrayItem(args) {
      var matches = args.path.match(/\[(\d+)\]$/);
      if (matches === null) {
        return false;
      }

      var index = Number(matches[1]);
      var indexRe = /\[\d+\]$/;

      var arrayPath = args.path.replace(indexRe, '');
      var arrayFormData = _.get(args.row, arrayPath);

      return arrayFormData.length === index + 1;
    }
  }
})();
