;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlLookupQueryVariables', GraphqlLookupQueryVariables);

  /** @ngInject */
  function GraphqlLookupQueryVariables() {
    return function getQueryParams(params, args) {
      var variables = {
        page: page(params),
        perPage: params.perPage || 15,
        filter: filterParam(params, args),
      };

      return variables;
    };

    function page(params) {
      var page = (params.skip / params.take) + 1;

      if (_.isNaN(page)) {
        return 1;
      }

      return page;
    }

    function filterParam(params, args) {
      var filter = { q: params.searchValue || '' };

      if (params.selectedTable.where) {
        filter.form = _.cloneDeep(args.row);
        _.unset(filter.form, '_id');
        _.unset(filter.form, '_actions');
      }

      return filter;
    }
  }
})();
