;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('ComplexTypesDataTransformer', ComplexTypesDataTransformer);

  /** @ngInject */
  function ComplexTypesDataTransformer(
    FormattersHelper
  ) {
    return function transformDataForYaml(args, CellRenderer) {
      if (isObject(args)) {
        return transformObject(args, CellRenderer);
      } else if (isArray(args)) {
        return transformArray(args, CellRenderer);
      } else if (args.fieldSchema.type === 'Mixed') {
        return args.data;
      } else {
        return leaf(args, CellRenderer);
      }

      function transformObject(args, CellRenderer) {
        var objVal = _.transform(args.data, function (result, value, key) {
          var nextArgs = nextObjItemArgs(args, value, key);

          result[nextArgs.fieldSchema.fullName] = transformDataForYaml(nextArgs, CellRenderer);
        }, {});

        return _.isEmpty(objVal) ? null : objVal;
      }

      function transformArray(args, CellRenderer) {
        var transformResult = args.fieldSchema.type === 'AssociativeArray' ? {} : [];

        var arrayValue = _.transform(args.data, function (result, value, index) {
          var arrayItemArgs = nextArrayItemArgs(args, value);
          result[index] = transformDataForYaml(arrayItemArgs, CellRenderer);
        }, transformResult);

        return _.isEmpty(arrayValue) ? null : arrayValue;
      }
    }

    function shallowCopyWith(obj, mixObject) {
      return _.assign({}, obj, mixObject);
    }

    function nextObjItemArgs(args, value, key) {
      return shallowCopyWith(args, {
        data: value,
        fieldSchema: args.fieldSchema.fields[key],
        schemaPath: args.schemaPath.concat('.', key),
      });
    }

    function nextArrayItemArgs(args, value) {
      // little trick: transforming array fieldSchema copy to Object type
      // because processing for array items are the same as for object item
      var field = shallowCopyWith(args.fieldSchema, { type: 'Object' });
      return shallowCopyWith(args, { data: value, fieldSchema: field });
    }

    function leaf(leafArgs, CellRenderer) {
      if (leafArgs.fieldSchema.type === 'TreeSelector') {
        return transformTreeSelector(leafArgs);
      }

      _.set(leafArgs, 'params.asText', true);
      return CellRenderer(leafArgs);
    }

    function isObject(args) {
      return args.fieldSchema.type === 'Object';
    }

    function isArray(args) {
      return _.includes(['Array', 'AssociativeArray'], args.fieldSchema.type);
    }

    function transformTreeSelector(args) {
      if (args.data)
      return FormattersHelper.asText(args) ?
        transformTreeSelectorToText(args) :
        transformTreeSelectorForHtml(args);
    }

    function transformTreeSelectorForHtml(args) {
      var current = [];
      var result = current;

      _.each(args.data, function (value, index) {
        current.push(value.label);

        var isLast = args.data.length - 1 === index;
        if (isLast) {
          return;
        }

        current.push([]);
        current = current[1];
      });

      return result;
    }

    function transformTreeSelectorToText(args) {
      var result = {};
      var current = result;

      _.each(args.data, function (value, index) {
        current[value.label] = {};

        var isLast = args.data.length - 1 === index;
        if (isLast) {
          return;
        }

        current = current[value.label];
      });

      return result;
    }
  }
})();
