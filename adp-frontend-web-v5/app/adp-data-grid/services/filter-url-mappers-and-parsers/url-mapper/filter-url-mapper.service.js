;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('filterUrlMapper', filterUrlMapper);

  /** @ngInject */
  function filterUrlMapper(
    GridFilterHelpers,
    FilterOperation,
    urlMappingRules,
    $state,
    $location
  ) {
    return function (gridInstance, schema) {
      var filters = getFiltersFromGrid(gridInstance, schema);
      var result = [];

      _.each(filters, function (filter) {
        var mapperFn = getMapperFunction(filter);
        if (!mapperFn) {
          return;
        }

        var stringValuePair = mapperFn(filter);
        if (!stringValuePair) {
          return;
        }

        result.push(stringValuePair);

        if (filter.operation) {
          var stringOperationPair = [filter.fieldName + 'Operation', filter.operation].join('=');
          result.push(stringOperationPair);
        }
      });

      makeTransitionToUrl(result);
    };

    function getFiltersFromGrid(gridInstance, schema) {
      var result = [];

      for(var i = 0; i < gridInstance.columnCount(); i++) {
        var fieldName = gridInstance.columnOption(i, 'dataField');
        var operation = gridInstance.columnOption(fieldName, 'selectedFilterOperation');
        var filterValue = gridInstance.columnOption(fieldName, 'filterValue');

        if (_.isNil(filterValue) || filterValue === '') {
          continue;
        }

        result.push({
          fieldName: fieldName,
          field: _.get(schema, 'fields.' + fieldName),
          value: filterValue,
          operation: FilterOperation.encode(operation),
        });
      }

      return result;
    }

    function getMapperFunction(filter) {
      var filterRenderer = GridFilterHelpers.getFilterRenderer(filter.field);
      if (!filterRenderer) {
        return;
      }
      return urlMappingRules[filterRenderer.value];
    }

    function makeTransitionToUrl(result) {
      var currentParams = $location.search();
      var filterStringParam = encodeURIComponent(result.join('&'));

      if (filterStringParam) {
        currentParams.filter = encodeURIComponent(result.join('&'));
      } else {
        _.unset(currentParams, 'filter');
      }

      $location.search(currentParams);
    }
  }
})();
