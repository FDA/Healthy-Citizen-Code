;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridSorting', GridSorting);

  /** @ngInject */
  function GridSorting() {
    function setSortingOptions(options, schema) {
      setDefaultSortOrder(options, schema);
    }

    function setDefaultSortOrder(options, schema) {
      var defaultSortOptions = _.get(schema, 'defaultSortBy');
      var sortIndex = 0;

      _.each(defaultSortOptions, function (order, fieldName) {
        var sortingColumn = findSortingColumn(options.columns, fieldName);
        if (!sortingColumn) {
          return;
        }

        setSortOptionsToColumn(sortingColumn, order, sortIndex);
        sortIndex++;
      });
    }

    function findSortingColumn(columns, fieldName) {
      return _.find(columns, ['dataField', fieldName]);
    }

    function setSortOptionsToColumn(column, order, index) {
      _.assign(column, {
        sortIndex: index,
        sortOrder: order === 1 ? 'asc' : 'desc',
      });
    }

    return {
      setSortingOptions: setSortingOptions,
    }
  }
})();
