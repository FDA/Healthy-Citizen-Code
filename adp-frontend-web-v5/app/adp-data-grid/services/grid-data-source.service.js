;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridDataSource', GridDataSource);

  /** @ngInject */
  function GridDataSource(
    GraphqlCollectionQuery,
    GraphqlCollectionMutator,
    AdpFormDataUtils,
    AdpNotificationService,
    $q,
    ErrorHelpers,
    ServerError
  ) {
    function createStore(schema) {
      return new DevExpress.data.CustomStore({
        load: function (loadOptions) {
          return GraphqlCollectionQuery(schema, loadOptions)
            .then(!!loadOptions.group ? getGroupedData : getData)
            .catch(function () {
              AdpNotificationService.notifyError(ServerError.UNABLE_TO_GET_DATA);
              return $q.reject();
            });
        },
        insert: function(values) {
          var cleanedData = cleanupData(values, schema);

          return GraphqlCollectionMutator.create(schema, cleanedData)
            .catch(function (error) {
              ErrorHelpers.handleError(error, 'Unknown error, while trying to create record in cell editor');
              throw error;
            });
        },
        update: function (keys, values) {
          var data = _.merge({}, keys, values);
          var cleanedData = cleanupData(data, schema);

          _.unset(cleanedData, '_actions');

          return GraphqlCollectionMutator.update(schema, cleanedData)
            .catch(function (error) {
              ErrorHelpers.handleError(error, 'Unknown error, while trying to update record in cell editor');
              throw error;
            });
        }
      });
    }

    function getData(data) {
      return {
        data: _.get(data, 'items', []),
        totalCount: _.get(data, 'count', 0),
      };
    }

    function getGroupedData(data) {
      return {
        data: _.get(data, 'data', []),
        totalCount: _.get(data, 'totalCount', 0),
        groupCount: _.get(data, 'groupCount', 0),
        summary: data.summary || []
      };
    }

    function cleanupData(values, schema) {
      var data = _.cloneDeep(values);
      [ '__KEY__', '_actions'].forEach(function (path) {
        _.unset(data, path);
      });

      return AdpFormDataUtils.cleanFormData(data, schema);
    }

    return {
      create: function (options, schema) {
        options.dataSource = {store: createStore(schema)};
        options.onFileSaving = function (e) {
          e.fileName = schema.fullName || 'DataGrid';
        };

        return options;
      }
    }
  }
})();
