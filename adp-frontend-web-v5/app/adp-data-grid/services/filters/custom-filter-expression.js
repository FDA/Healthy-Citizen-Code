;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('CustomFilterExpression', CustomFilterExpression);

  /** @ngInject */
  function CustomFilterExpression(AdpUnifiedArgs) {
    var expressions = {
      Boolean: calculateExprForBoolean,
      DateTime: transformBetweenToNonStrictRange,
      Date: transformBetweenToNonStrictRange,
      Time: transformBetweenToNonStrictRange,
      Currency: transformBetweenToNonStrictRange,
      'Int32[]': transformBetweenToNonStrictRange,
      'Int64[]': transformBetweenToNonStrictRange,
      Number: transformBetweenToNonStrictRange,
      ImperialWeight: transformBetweenToNonStrictRange,

      ImperialWeightWithOz: imperialUnitMultipeExpr,
      ImperialHeight: imperialUnitMultipeExpr,
      LookupObjectID: transformLookup,
      'LookupObjectID[]': transformLookup,
    };

    return function (field, schema) {
      if (hasCustomFilterExpr(field)) {
        return getCustomFilterExpr(field, schema);
      }

      return expressions[field.type] || defaultFilterExpression;
    };

    function defaultFilterExpression(filterValue, selectedFilterOperation) {
      return [this.dataField, (selectedFilterOperation || this.defaultSelectedFilterOperation), filterValue];
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

    function getCustomFilterExpr(field, schema) {
      return function (filterValue, selectedFilterOperation, target) {
        var customDataSourceName = _.get(field, 'parameters.calculateFilterExpression', null);
        var exprFn = _.get(window, 'appModelHelpers.DxCalculateFilterExpression.' + customDataSourceName, null);

        var args = getUnifiedArgs(field, schema);
        args.filterValue = filterValue;
        args.selectedFilterOperation = selectedFilterOperation;
        args.target = target;

        return exprFn.call(args);
      };
    }

    function hasCustomFilterExpr(field) {
      return _.hasIn(field, 'parameters.calculateFilterExpression');
    }

    function getUnifiedArgs(field, schema) {
      return AdpUnifiedArgs.getHelperParamsWithConfig({
        path: field.fieldName,
        formData: null,
        action: null,
        schema: schema,
      });
    }
  }
})();
