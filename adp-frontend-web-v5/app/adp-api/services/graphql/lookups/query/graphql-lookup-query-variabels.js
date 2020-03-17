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
      var filter = {};
      if (params.searchValue) {
        filter.q = params.searchValue || '';
      } else {
        filter.dxQuery = JSON.stringify(params.dxQuery);
      }

      if (params.selectedTable.where) {
        setFormDataToFilter(filter, args.row);
      }

      return filter;
    }

    function setFormDataToFilter(filter, formData) {
      filter.form = _.cloneDeep(formData);
      _.unset(formData, '_id');
      _.unset(formData, '_actions');
    }
  }
})();
