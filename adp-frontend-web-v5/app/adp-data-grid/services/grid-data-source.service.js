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
    ServerError,
    GridOptionsHelpers,
    GridSchema
  ) {
    return function (options, schema, customOptions) {
      options.dataSource = { store: createStore(schema, customOptions) };

      if (schema.parameters.loadInvisibleFields === false) {
        registerColumnsVisibilityListener(options);
      }

      return options;
    }

    function createStore(schema, customOptions) {
      return new DevExpress.data.CustomStore({
        load: function (loadOptions) {
          var requestSchema = provideRequestSchema(schema, customOptions.gridComponent);

          loadOptions.customOptions = customOptions.value();
          loadOptions.isGroupFilter = groupingEnabled(customOptions.gridComponent);

          return GraphqlCollectionQuery(requestSchema, loadOptions)
            .then(!!loadOptions.group ? getGroupedData : getData)
            .catch(function (err) {
              ErrorHelpers.handleError(err);
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

          return GraphqlCollectionMutator.update(schema, cleanedData)
            .catch(function (error) {
              ErrorHelpers.handleError(error, 'Unknown error, while trying to update record in cell editor');
              throw error;
            });
        }
      });
    }

    function registerColumnsVisibilityListener(options) {
      GridOptionsHelpers.onOptionChanged(options, function (e) {
        var columnsVisibilityChanged = /^columns\[\d+\].visible$/.test(e.fullName);
        var changedToVisible = e.value === true;

        if (columnsVisibilityChanged && changedToVisible) {
          e.component.refresh();
        }
      });
    }

    function provideRequestSchema(schema, gridInstance) {
      if (schema.parameters.loadInvisibleFields) {
        return schema;
      }

      return GridSchema.getSchemaForVisibleColumns(schema, gridInstance);
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

      [
        '__KEY__',
        '__DX_INSERT_INDEX__',
        '_actions',
        'parentKey',
        'pageIndex',
        'rowIndex',
        'dataRowIndex',
      ].forEach(function (path) {
        _.unset(data, path);
      });

      return AdpFormDataUtils.transformDataBeforeSending(data, schema);
    }

    function groupingEnabled(grid) {
      for (var i = 0; i < grid.columnCount(); i++){
        if(grid.columnOption(i, 'groupIndex') > -1){
          return true;
        }
      }

      return false;
    }
  }
})();
