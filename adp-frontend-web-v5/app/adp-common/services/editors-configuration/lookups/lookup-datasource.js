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
      var selectedTable = args.fieldSchema.lookup.table[selectedTableName];
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
        byKey: function (key) {
          return Promise.resolve(selectItemByKey(args.data, key));
        }
      };

      return options;
    }

    function selectItemByKey(data, key) {
      if (_.isArray(data)) {
        return _.find(data, function (i) {
          return key === i._id;
        });
      } else {
        return data;
      }
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
