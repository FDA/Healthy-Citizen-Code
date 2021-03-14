;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlCollectionQueryVariables', GraphqlCollectionQueryVariables);

  /** @ngInject */
  function GraphqlCollectionQueryVariables(GraphqlHelper) {
    return function (schema, params) {
      var ret;

      if (params.group) {
        ret = {
          group: params.group || [],
          groupSummary: params.groupSummary || [],
          totalSummary: params.totalSummary || [],
          dxQuery: dxQuery(schema, params),
          skip: params.skip,
          take: params.take,
        };
      } else {
        ret = {
          sort: sort(params.sort),
          dxQuery: dxQuery(schema, params),
          isGroupFilter: params.isGroupFilter,
        };

        if (params.take) {
          ret.page = page(params);
          ret.perPage = perPage(params.take);
        }
      }

      if (params.customOptions && params.customOptions.quickFilterId) {
        ret.quickFilterId = params.customOptions.quickFilterId;
      }

      return ret;
    };

    function sort(sort) {
      var fieldNameToSortBy = 'selector';
      var sortObject = _.keyBy(sort, fieldNameToSortBy);
      var sortParams = _.mapValues(sortObject, function (val) {
        return val.desc ? -1 : 1;
      });

      sortParams = _.map(sortParams, function (value, key) {
        return [key, value].join(':')
      });

      return '{' + sortParams.join(', ') + '}';
    }

    function dxQuery(schema, params) {
      var buildFilter = params.customOptions && _.clone(params.customOptions.filterBuilder);
      var filter = GraphqlHelper.combineFilters(schema, params.filter, buildFilter);

      if (!filter) {
        return '';
      }

      return JSON.stringify(filter);
    }

    function page(params) {
      var page = Math.floor(params.skip / params.take) + 1;

      if (_.isNaN(page)) {
        return 1;
      }

      return page;
    }

    function perPage(perPage) {
      if (!perPage) {
        return 10;
      }

      return perPage;
    }

  }
})();
