;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlHelper', GraphqlHelper);

  /** @ngInject */
  function GraphqlHelper(AdpTime) {
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
        return {type: 'Mongo Expression', expression: filter[2].value}
      },
      relativeDate: function (filter) {
        return {
          type: 'Relative Date',
          expression: {
            fieldPath: filter[0],
            operation: filter[1],
            value: filter[2].value,
            timezone: AdpTime.guessTimeZone(),
          }
        };
      },
      databaseField: function (filter) {
        return {type: 'Database Field', expression: [filter[0], filter[1], filter[2].value]}
      },
      default: function (filter) {
        return [filter[0], filter[1], filter[2].value];
      },
    }

    function processCustomTypedValues(schema, filter) {
      if (!filter || _.isString(filter)) {
        return filter;
      }

      if (filter[0] === '!') {
        return ['!', processCustomTypedValues(schema, filter[1])];
      } else if (_.isString(filter[0])) {
        var value = filter[2];

        if (_.isObject(value) && value.type) {
          return processValueByType(schema, filter, value.type);
        } else {
          return filter;
        }
      } else {
        return _.map(filter, function (x) {
          return processCustomTypedValues(schema, x);
        })
      }
    }

    function processValueByType(schema, filter, type) {
      var typeProcessor = typeProcessors[type];

      return typeProcessor ? typeProcessor(filter, schema) : filter;
    }

    function combineFilters(schema, filter, buildFilter) {
      if (buildFilter && buildFilter.length) {
        buildFilter = processCustomTypedValues(schema, buildFilter);
        return filter ? [filter, 'and', buildFilter] : buildFilter;
      } else {
        return filter;
      }
    }

    return {
      wrapFieldString: wrapFieldString,
      collectionQueryName: collectionQueryName,
      combineFilters: combineFilters,
    };
  }
})();
