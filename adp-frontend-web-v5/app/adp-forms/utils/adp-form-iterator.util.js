;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpFormIteratorUtils', AdpFormIteratorUtils);

  function AdpFormIteratorUtils(
    AdpUnifiedArgs
  ) {
    function traverseFormDataPostOrder(args, callback) {
      _.each(args.fieldSchema.fields, function (currentField) {
        var currArgs = AdpUnifiedArgs.next(args, currentField.fieldName);

        if (_typeOfObject(currArgs.fieldSchema)) {
          traverseFormDataPostOrder(currArgs, callback);
        } else if (_typeOfArray(currArgs.fieldSchema)) {
          _.each(currArgs.data, function (_d, index) {
            var currArrayArgs = _.assign({}, currArgs, {
              path: currArgs.path + '[' + index + ']',
            });
            currArrayArgs.data = _.get(currArrayArgs.row, currArrayArgs.path);

            traverseFormDataPostOrder(currArrayArgs, callback);
          });
        } else {
          _isFieldVisible(currentField) && callback(currArgs);
        }
      });

      callback(args);
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
      traverseFormDataPostOrder: traverseFormDataPostOrder,
    };
  }
})();
