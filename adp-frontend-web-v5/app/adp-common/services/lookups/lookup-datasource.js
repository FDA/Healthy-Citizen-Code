;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .factory('LookupDataSource', LookupDataSource);

  /** @ngInject */
  function LookupDataSource(
    GraphqlLookupQuery,
    ErrorHelpers
  ) {
    return function (args, selectedTableName) {
      var selectedTable = args.modelSchema.lookup.table[selectedTableName];
      var options = getOptions(args, selectedTable);

      return new DevExpress.data.DataSource(options);
    };

    function getOptions(args, selectedTable) {
      var options = {
        paginate: true,
        requireTotalCount: true,
        pageSize: 15,
        load: setFetchFn(args, selectedTable),
        key: '_id',
        byKey: function () {
          return Promise.resolve(args.data);
        }
      };

      return options;
    }

    function setFetchFn(args, selectedTable) {
      return function (loadOptions) {
        var queryParams = _.assign({ selectedTable: selectedTable }, loadOptions);

        return GraphqlLookupQuery(args, queryParams)
          .then(function (data) {
            return { data: data.items, totalCount: data.count };
          })
          .catch(function (error) {
            ErrorHelpers.handleError(error, 'Error trying to get lookup value.');
          });
      };
    }
  }
})();
