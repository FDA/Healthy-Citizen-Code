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
    GridLifecycleActions,
    GridRtcActions,
    GridOptionsHelpers,
    AdpGridCustomOptionsService,
    GridFilters,
    CellEditorsService,
    GridHeaderFilters,
    AdpListsService
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
      var overriders = {
        filterPanel: {
          visible: false    // Filter panel is blocked since its functionality is moved into filterBuilder(action) instead
        }
      };
      var options = _.assign(
        {},
        presentation,
        other,
        schemaParameters,
        overriders
      );

      GridDataSource(options, schema, customGridOptions);
      GridColumns(options, schema, customGridOptions);
      GridFilters.create(options, schema);
      GridHeaderFilters(options, schema);
      CellEditorsService(options, schema);
      GridFilters.setFiltersFromUrl(options, schema);
      GridToolbarActions(options, schema, customGridOptions);
      GridLifecycleActions(options, schema, customGridOptions);
      GridRtcActions(options, schema, customGridOptions);

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

          setTimeout(function () {
            customGridOptions.gridComponent && customGridOptions.gridComponent._views.headerPanel._toolbar.repaint();
          }, 300);

          delete state.selectedRowKeys;

          return state;
        };

       customGridOptions.setHandler("change", "$$$", function () {
          if (this.gridComponent) {
            var gridComponent = this.gridComponent;
            // deferring save is required since 'change' handler invoked by customLoad() synchronously and 'normal' state of the grid still empty at that point
            setTimeout(function () {
              var state = gridComponent.state();

              customSaveState(state);
            }, 300);
          }
        })
      }

      var scrollMode = _.get(options, "scrolling.mode");
      if (scrollMode === 'virtual' || scrollMode === 'infinite') {
        options.paging.pageSize = Math.max(100, options.paging.pageSize);
      }

      var prevDisposer = options.onDisposing;
      options.onDisposing = function (event) {
        if (prevDisposer) {
          prevDisposer(event);
        }

        customGridOptions.handlers.destroy && customGridOptions.handlers.destroy();
        AdpListsService.dropCache();
      };

      GridOptionsHelpers.onOptionChanged(options, function (e) {
        if (e.fullName !== 'paging.pageIndex') {
          return;
        }

        var isGridVisible = e.component.element()[0].getBoundingClientRect().top > 0;
        if (isGridVisible) {
          return;
        }

        var scrollPos = e.component.element().offset().top;

        $('html, body').animate({
          scrollTop: scrollPos
        }, 300);
      });

      return options;
    }

    return {
      create: create,
    };
  }
})();
