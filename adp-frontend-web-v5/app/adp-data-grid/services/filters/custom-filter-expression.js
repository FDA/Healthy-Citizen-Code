;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('CustomFilterExpression', CustomFilterExpression);

  /** @ngInject */
  function CustomFilterExpression() {
    var expressions = {
      Boolean: calculateExprForBoolean,
      DateTime: transformBetweenToNonStrictRange,
      Date: transformBetweenToNonStrictRange,
      Time: transformBetweenToNonStrictRange,
      Number: transformBetweenToNonStrictRange,
      ImperialWeight: transformBetweenToNonStrictRange,
      ImperialWeightWithOz: imperialUnitMultipeExpr,
      ImperialHeight: imperialUnitMultipeExpr,
      LookupObjectID: transformLookup,
      'LookupObjectID[]': transformLookup,
    };

    return function (field) {
      return expressions[field.type] || defaultFilterExpression;
    };

    function defaultFilterExpression(filterValue, selectedFilterOperation) {
      return [this.dataField, selectedFilterOperation || this.defaultSelectedFilterOperation, filterValue];
    }

    function calculateExprForBoolean(filterValue, selectedFilterOperation) {
      if (filterValue === 'TRUE_VALUE') {
        return [this.dataField, selectedFilterOperation, true];
      }

      if (filterValue === 'FALSE_VALUE') {
        return [this.dataField, selectedFilterOperation, null];
      }

      return this.defaultCalculateFilterExpression.apply(this, arguments);
    }

    function imperialUnitMultipeExpr(filterValue, selectedFilterOperation) {
      var mapToNumbers = function (v) {
        return _.isNil(v) ? v :  v.split('.').map(Number);
      }
      var val = _.isArray(filterValue) ?
        filterValue.map(mapToNumbers) :
        mapToNumbers(filterValue);

      return transformBetweenToNonStrictRange.call(this, val, selectedFilterOperation);
    }

    function transformBetweenToNonStrictRange(filterValue, selectedFilterOperation) {
      if (selectedFilterOperation === 'between') {
        var bothValuesAreNil = _.compact(filterValue).length === 0;

        if (bothValuesAreNil) {
          return null;
        } else if (_.isNil(filterValue[0])) {
          return [this.dataField, '<=', filterValue[1]];
        } else if (_.isNil(filterValue[1])) {
          return [this.dataField, '>=', filterValue[0]];
        } else {
          return [[this.dataField, '>=', filterValue[0]],'and',[this.dataField, '<=', filterValue[1]]]
        }
      }

      return this.defaultCalculateFilterExpression.apply(this, arguments);
    }

    function transformLookup(filterValue, selectedFilterOperation) {
      return [this.dataField, selectedFilterOperation, filterValue];
    }
  }
})();
