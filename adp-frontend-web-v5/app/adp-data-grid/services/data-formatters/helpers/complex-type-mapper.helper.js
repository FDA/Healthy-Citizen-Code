;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('ComplexTypesMapper', ComplexTypesMapper);

  /** @ngInject */
  function ComplexTypesMapper() {
    return function MapperFn(args, Builder) {
      var field = args.modelSchema;

      if (isArray(field)) {
        return mapToArray(args);
      } else if (isObject(field)) {
        return mapToObject(args);
      } else {
        return Builder.leaf(args);
      }

      function mapToArray(arrayArgs) {
        var arrayValue = _.map(arrayArgs.data, function (arrayItem, arrayIndex) {

          var nextArgs = _.assign({}, arrayArgs, { data: arrayItem });
          return Builder.arrayItem(mapToObject(nextArgs), arrayIndex);
        });

        var nextArgs = _.assign({}, arrayArgs, { data: arrayValue });
        return Builder.array(nextArgs);
      }

      function mapToObject(objArgs) {
        var objectValue = _.chain(objArgs.data)
          .map(function (val, key) {
            return iteratee(val, key, objArgs);
          })
          .compact()
          .value();

        var nextArgs = _.assign({}, objArgs, { data: objectValue });
        return Builder.object(nextArgs);
      }

      function iteratee(value, key, parentArgs) {
        if (key === '_id') {
          return null;
        }

        var nextSchema = _.get(parentArgs, 'modelSchema.fields.' + key, {});
        var nextArgs = _.assign({}, parentArgs, { data: value, modelSchema: nextSchema });

        return MapperFn(nextArgs, Builder);
      }
    }

    function isObject(field) {
      return field.type === 'Object';
    }

    function isArray(field) {
      return ['Array', 'AssociativeArray'].includes(field.type);
    }
  }
})();
