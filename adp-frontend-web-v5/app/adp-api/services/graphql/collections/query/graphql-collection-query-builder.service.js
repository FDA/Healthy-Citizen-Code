;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlCollectionQueryBuilder', GraphqlCollectionQueryBuilder);

  /** @ngInject */
  function GraphqlCollectionQueryBuilder(GraphqlCollectionFields) {
    return function (queryName, schema, options) {
      var isQf = options.customOptions && options.customOptions.quickFilterId;
      var qfType = isQf ? ", $quickFilterId: MongoId" : "";
      var qfValue = isQf ? ", quickFilterId: $quickFilterId" : "";

      if (options.group) {
        return [
          'query q($dxQuery: String! ',qfType,', $group: [dxGroupInput], $groupSummary: [dxSummaryInput], $totalSummary: [dxSummaryInput], $skip: Int, $take: Int) {',
            queryName,
            '(',
              'filter: { dxQuery: $dxQuery ', qfValue, ' },',
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
          'query q($sort: String, $page: Int, $perPage: Int, $dxQuery: String!',qfType,') {',
            queryName,
            '(',
              'sort: $sort,',
              'page: $page,',
              'perPage: $perPage,',
              'filter: { dxQuery: $dxQuery', qfValue, '},',
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
