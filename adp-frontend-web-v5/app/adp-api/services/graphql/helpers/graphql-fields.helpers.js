;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlHelper', GraphqlHelper);

  /** @ngInject */
  function GraphqlHelper() {

    function wrapFieldString(fieldsString, name) {
      return [
        name,
        '{',
        fieldsString,
        '}',
      ].join('\n');
    }

    function collectionQueryName(schema, params) {
      return schema.schemaName + 'Dx' + (params.group ? 'Group' : '');
    }

    var typeProcessors = {
      mongoExpression: function (filter) {
        return {type: "Mongo Expression", expression: filter[2].value}
      },
      relativeDate: function (filter) {
        return [filter[0], filter[1], filter[2].value]
      },
      databaseField: function (filter) {
        return {type: "Database Field", expression: [filter[0], filter[1], filter[2].value]}
      },
      default: function (filter) {
        return [filter[0], filter[1], filter[2].value]
      },
    }

    function processCustomTypedValues(filter) {
      if (!filter || _.isString(filter)) {
        return filter;
      }

      if (filter[0] === "!") {
        return ["!", processCustomTypedValues(filter[1])];
      } else if (_.isString(filter[0])) {
        var value = filter[2];

        if (_.isObject(value) && value.type) {
          return processValueByType(filter, value.type);
        } else {
          return filter;
        }
      } else {
        return _.map(filter, processCustomTypedValues)
      }
    }

    function processValueByType(filter, type) {
      var typeProcessor = typeProcessors[type];

      return typeProcessor ? typeProcessor(filter) : filter;
    }

    return {
      wrapFieldString: wrapFieldString,
      collectionQueryName: collectionQueryName,
      processCustomTypedValues:processCustomTypedValues,
    };
  }
})();
