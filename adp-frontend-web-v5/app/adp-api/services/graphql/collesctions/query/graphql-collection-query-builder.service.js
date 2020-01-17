;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlCollectionQueryBuilder', GraphqlCollectionQueryBuilder);

  /** @ngInject */
  function GraphqlCollectionQueryBuilder(GraphqlCollectionFields) {
    return function (queryName, schema, options) {
      if (options.group) {
        return [
          'query q($dxQuery: String!, $group: [dxGroupInput], $groupSummary: [dxSummaryInput], $totalSummary: [dxSummaryInput], $skip: Int, $take: Int) {',
            queryName,
            '(',
              'filter: { dxQuery: $dxQuery },',
              'group: $group,',
              'groupSummary: $groupSummary,',
              'totalSummary: $totalSummary,',
              'requireTotalCount: ' + !!options.requireTotalCount + ',',
              'requireGroupCount: ' + !!options.requireGroupCount + ',',
              'skip: $skip,',
              'take: $take,',
            ') {',
              'data',
              options.requireTotalCount ? 'totalCount' : '',
              options.requireGroupCount ? 'groupCount' : '',
              options.groupSummary || options.totalSummary ? 'summary' : '',
            '}',
          '}',
        ].join('\n');
      } else {
        var items = GraphqlCollectionFields.get(schema);
        return [
          'query q($sort: String, $page: Int, $perPage: Int, $dxQuery: String!) {',
            queryName,
            '(',
              'sort: $sort,',
              'page: $page,',
              'perPage: $perPage,',
              'filter: { dxQuery: $dxQuery },',
            ') {',
              'count',
              items,
            '}',
          '}',
        ].join('\n');
      }
    }
  }
})();
