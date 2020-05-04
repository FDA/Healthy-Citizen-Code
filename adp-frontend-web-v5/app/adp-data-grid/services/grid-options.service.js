;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridOptions', GridOptions);

  /** @ngInject */
  function GridOptions(
    GridColumns,
    GridDataSource,
    GridToolbarActions,
    GridOptionsHelpers,
    AdpGridCustomOptionsService,
    GridFilters,
    CellEditorsService
  ) {
    function create(schema) {
      var presentation = {
        showBorders: true,
        showColumnLines: true,
        wordWrapEnabled: true,
      };
      var customGridOptions = AdpGridCustomOptionsService.create();
      var other = {
        remoteOperations: true,
        twoWayBindingEnabled: false,
        errorRowEnabled: false,
        onInitialized: function (e) {
          customGridOptions.setGridComponent(e.component);
        },
        onDataErrorOccurred: function () {
          this.dataErrorMessage = 'Data Loading Error';
        },
        onContentReady: function (e) {
          if (e.component.totalCount() > 0) {
            return;
          }

          var filterEmpty = _.isNil(e.component.getCombinedFilter());
          var noDataText = filterEmpty ?
            'This collection is empty' :
            'The filter you specified returned no data';

          var noDataTextChanged = e.component.option('noDataText') !== noDataText;
          noDataTextChanged && e.component.option('noDataText', noDataText);
        },
      };
      var schemaParameters = _.cloneDeep(schema.parameters) || {};
      var options = _.assign(
        {},
        presentation,
        other,
        schemaParameters
      );

      GridDataSource(options, schema, customGridOptions);
      GridColumns(options, schema, customGridOptions);
      GridFilters.create(options, schema);
      CellEditorsService(options, schema);
      GridFilters.setFiltersFromUrl(options, schema);
      GridToolbarActions(options, schema, customGridOptions);

      if (options.stateStoring &&
        options.stateStoring.enabled &&
        options.stateStoring.type === "localStorage") {

        var customSaveState = function (state) {
          state._customOptions = customGridOptions.value();
          localStorage.setItem(storageKey, JSON.stringify(state));
        };

        var storageKey = GridOptionsHelpers.generateGridLsKey(options.stateStoring.storageKey, schema.schemaName);

        options.stateStoring.storageKey = storageKey;
        options.stateStoring.type = "custom";
        options.stateStoring.customSave = customSaveState;
        options.stateStoring.customLoad = function () {
          var json = localStorage.getItem(storageKey);
          var state = {};

          if (json) {
            try {
              state = JSON.parse(json);
            } catch (e) {
            }
          }

          customGridOptions.value(state._customOptions || {});
          delete state._customOptions;

          return state;
        };

        customGridOptions.setHandler('change', 'quickFilterId', function(){
          if (this.gridComponent) {
            var state = this.gridComponent.state();

            customSaveState(state);
          }
        })
      }

      var scrollMode = _.get(options, "scrolling.mode");
      if (scrollMode === 'virtual' || scrollMode === 'infinite') {
        options.paging.pageSize = Math.max(100, options.paging.pageSize);
      }

      options.filterBuilder = {
        onEditorPreparing: function (e) {
          GridFilters.setFilterComponent(e, schema);
        }
      }

      return options;
    }

    return {
      create: create,
    };
  }
})();
