;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('ShowInDataFiltrationHelper', ShowInDataFiltrationHelper);

  /** @ngInject */
  function ShowInDataFiltrationHelper(AdpUnifiedArgs) {
    return function (rootArgs, cb) {
      var rootArgsCopy = _.cloneDeep(rootArgs);
      rootArgsCopy.data = rootArgsCopy.row;

      return evalShownIn(rootArgsCopy);

      function evalShownIn(curArgs) {
        var field = curArgs.fieldSchema;

        if (isArray(field)) {
          return filterArray(curArgs);
        } else if (isObject(field) || isSchema(field)) {
          return filterObject(curArgs);
        } else {
          return curArgs.data;
        }

        function filterArray(arrayArgs) {
          var dest = arrayArgs.fieldSchema.type === 'Array' ? [] : {};

          return  _(arrayArgs.data)
            .transform(function (result, arrayItem, arrayIndexOrKey) {
              result[arrayIndexOrKey] = filterArrayItem(arrayArgs, arrayItem, arrayIndexOrKey);
            }, dest)
            .pull(undefined)
            .value();
        }

        function filterArrayItem(arrayArgs, arrayItem, arrayIndexOrKey) {
          var arrayItemArgs = getArrayArgs(arrayArgs, arrayItem, arrayIndexOrKey);
          var shouldShow = cb(arrayItemArgs);

          if (!shouldShow) {
            return;
          }

          return filterObject(arrayItemArgs);
        }

        function filterObject(curArgs) {
          return _.transform(curArgs.data, function (acc, val, name) {
            var newVal = iteratee(curArgs, val, name);
            (newVal !== undefined) && (_.set(acc, name, newVal));
          }, {});
        }

        function iteratee(curArgs, val, name) {
          var nextArgs = getNextArgs(curArgs, name);
          var shouldShow = cb(nextArgs);

          if (!shouldShow) {
            return;
          }

          return evalShownIn(nextArgs, val);
        }

        function isObject(field) {
          return field.type === 'Object';
        }

        function isSchema(field) {
          return field.type === 'Schema';
        }

        function isArray(field) {
          return field.type === 'Array' || field.type === 'AssociativeArray';
        }

        function getArrayArgs(arrayArgs, arrayItem, arrayIndexOrKey) {
          var isAssocArray = _.isString(arrayIndexOrKey);

          if (isAssocArray) {
            return _.assign({}, arrayArgs, {
              data: arrayArgs.data[arrayIndexOrKey]
            });
          } else {
            return AdpUnifiedArgs.getHelperParams({
              path: arrayArgs.path + '[' + arrayIndexOrKey + ']',
              formData: arrayArgs.row,
              action: arrayArgs.action,
              schema: arrayArgs.modelSchema,
            });
          }
        }

        function getNextArgs(args, name) {
          var nextArgs = AdpUnifiedArgs.next(args, name);

          if (args.fieldSchema.type === 'AssociativeArray') {
            return _.assign({}, nextArgs, {
              data: _.get(args.data, name),
            });
          }

          return nextArgs;
        }

      }
    }
  }
})();
