;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpFormDataUtils', AdpFormDataUtils);

  function AdpFormDataUtils(
    AdpValidationService,
    AdpFormIteratorUtils
  ) {
    var cleanUpStrategies = {
      'Object': _cleanObject,
      'Array': _cleanArrayItem,
      'Schema': _cleanSchema,
      'TreeSelector': _cleanTreeSelector,
      'default': cleanPrimitiveValue
    };

    var cleanUpOptionsDefaults = {
      // clear array only when all of it's items are null values
      clearEmptyOnly: true
    };

    // refactor: use _.set
    // refactor: remove code dupes
    function _cleanObject(formData, currentField, path) {
      var objectValue = _.get(formData, path, formData);
      var parentFormData = _.get(formData, _parentPath(path), formData);

      if (_.isNil(parentFormData)) {
        return;
      }

      _cleanObjectInPlace(objectValue);

      if (_.isEmpty(objectValue)) {
        parentFormData[currentField.keyName] = null;
      }
    }

    function _cleanArrayItem(formData, currentField, path, options) {
      var indexRe = /\[\d+\]$/;

      var arrayPath = path.replace(indexRe, '');
      var arrayFormData = _.get(formData, arrayPath);
      var parentFormData = _.get(formData, _parentPath(arrayPath), formData);
      var currentFormData = _.get(formData, path);

      var index = Number(path.match(/\[(\d+)\]$/)[1]);
      var isLast = arrayFormData.length === index + 1;

      _cleanObjectInPlace(currentFormData);

      if (_.isEmpty(currentFormData)) {
        arrayFormData[index] = null;
      }

      if (isLast) {
        _cleanArray(currentField, arrayFormData, parentFormData, options)
      }
    }

    function _cleanArray(currentField, arrayFormData, parentFormData, options) {
      if (options.clearEmptyOnly) {
        _.pull(arrayFormData, null);

        if (_.isEmpty(arrayFormData)) {
          parentFormData[currentField.keyName] = currentField.required ? [{}] : null;
        }
      } else {
        var containsNullsOnly = _.every(arrayFormData, _.isNull);

        if (containsNullsOnly) {
          parentFormData[currentField.keyName]  = null;
        }
      }
    }

    function _cleanSchema(formData) {
      _cleanObjectInPlace(formData);
    }

    function _cleanTreeSelector(formData, currentField, path) {
      var value = _.get(formData, path, null);
      var parentPath = _parentPath(path);
      var parentFormData = _.get(formData, parentPath, formData);
      var fName = currentField.keyName;

      value = _.filter(value, function (i) {
        return !_.isEmpty(i);
      });

      value = value.length ? value : null;
      parentFormData && (parentFormData[fName] = value);
    }

    function cleanPrimitiveValue(formData, currentField, path) {
      var value = _.get(formData, path, null);
      var parentPath = _parentPath(path);
      var parentFormData = _.get(formData, parentPath, formData);
      var fName = currentField.keyName;

      if (_.isNil(value) || value === '') {
        parentFormData && (parentFormData[fName] = null);
      }
    }

    function _parentPath(path) {
      var pathArray = path.split('.');
      var parentPathArray = _.take(pathArray, pathArray.length - 1);

      return parentPathArray.join('.');
    }

    function _cleanObjectInPlace(object) {
      _.each(object, function (v, k) {
        if (_.isNull(v)) {
          delete object[k];
        }
      });

      var keys = _.keys(object), key = keys[0];
      var hasOnlyIdAsProperty = keys.length === 1 && key === '_id';

      if (hasOnlyIdAsProperty) {
        delete object[key];
      }
    }

    function cleanFormData(formData, schema, options) {
      if (_.isNil(formData)) {
        return;
      }

      var cleanUpOptions = _.defaults(options, cleanUpOptionsDefaults);
      var formDataCopy = _.cloneDeep(formData);

      var cleanUpCb = function (formDataRef, currentField, path) {
        var cleanupStrategy = cleanUpStrategies[currentField.type] ||
          cleanUpStrategies['default'];

        cleanupStrategy(formDataRef, currentField, path, cleanUpOptions);
      };

      AdpFormIteratorUtils.traverseFormDataPostOrder(formDataCopy, schema, '', cleanUpCb);

      return formDataCopy;
    }

    return {
      cleanFormData: cleanFormData
    };
  }
})();