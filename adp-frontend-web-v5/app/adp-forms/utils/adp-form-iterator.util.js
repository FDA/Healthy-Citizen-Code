;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpFormIteratorUtils', AdpFormIteratorUtils);

  function AdpFormIteratorUtils(AdpPath) {
    function traverseFormDataPostOrder(formData, schema, path, callback) {
      var _path = path || '';

      _.each(schema.fields, function (currentField, key) {
        var _nextPath = AdpPath.next(_path, key);

        if (_typeOfObject(currentField)) {
          traverseFormDataPostOrder(formData, currentField, _nextPath, callback);
        } else if (_typeOfArray(currentField)) {
          var arrayFormData = _.get(formData, _nextPath, []);

          _.each(arrayFormData, function (_data, i) {
            var nextArrayItemPath = _nextPath + '[' + i + ']';
            traverseFormDataPostOrder(formData, currentField, nextArrayItemPath, callback);
          });
        } else {
          // refactor: use method from schema service
          _isFieldVisible(currentField) && callback(formData, currentField, _nextPath, _path);
        }
      });

      callback(formData, schema, _path);
    }

    function _isFieldVisible(field) {
      return field.showInForm;
    }

    function _typeOfObject(f) {
      return f.type === 'Object';
    }

    function _typeOfArray(f) {
      return ['Array', 'AssociativeArray'].includes(f.type);
    }

    return {
      traverseFormDataPostOrder: traverseFormDataPostOrder
    };
  }
})();
