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
    AdpNotificationService,
    AdpGridViewService,
    AdpGridCustomOptionsService,
    AdpQuickFiltersService,
    AdpColumnChooserService,
    AdpModalService,
    GridFilters,
    CellEditorsService,
    GridImportService,
    GridExportService
  ) {
    function create(schema) {
      var presentation = {
        showBorders: true,
        showColumnLines: true,
        wordWrapEnabled: true,
      };

      var search = {
        searchPanel: {
          visible: true,
          placeholder: 'Search...'
        },
      };

      var customGridOptions = AdpGridCustomOptionsService.create();

      var other = {
        remoteOperations: true,
        twoWayBindingEnabled: false,
        errorRowEnabled: false,
        onInitialized: function(e) {
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
        }
      };

      var options = _.assign(
        {},
        _.cloneDeep(schema.parameters) || {},
        presentation,
        search,
        other
      );

      // Its very important to keep this cb register in very beginning to be sure its called AFTER ALL toolbar modifications
      GridOptionsHelpers.addToolbarHandler(options, function(e){
        GridToolbarActions.removeUnnecessary(e);
        GridToolbarActions.sortByName(e);
      });

      GridToolbarActions.addPrintAndCreate(options, schema);

      GridDataSource(options, schema, customGridOptions);
      GridColumns(options, schema);
      GridFilters.create(options, schema);
      CellEditorsService(options, schema);

      GridFilters.setFiltersFromUrl(options, schema);
      GridExportService(options, schema);
      GridImportService(options, schema);

      GridOptionsHelpers.addToolbarHandler(options, function (e) {
        e.toolbarOptions.items.push(
          {
            widget: "dxMenu",
            options: AdpGridViewService.createMenu(schema, e.component, customGridOptions),
            cssClass: "adp-grid-toolbar-dropdown-menu",
            name: "gridViewButton"
          });
      });

      GridOptionsHelpers.addToolbarHandler(options, function (e) {
        e.toolbarOptions.items.push(
          {
            widget: "dxMenu",
            options: AdpQuickFiltersService.createMenu(schema, e.component, customGridOptions),
            cssClass: "adp-grid-toolbar-dropdown-menu",
            name: "quickFiltersButton"
          });
      });

      if (_.get(options, 'columnChooser.enabled', false)) {
        // Disabling default columnChooser is not an option as some functionality will be broken. Default button is filtered out from toolbar.
        GridOptionsHelpers.addToolbarHandler(options, function (e) {
          e.toolbarOptions.items.push(
            {
              widget: 'dxMenu',
              options: AdpColumnChooserService.createMenu(schema, e.component),
              cssClass:'adp-grid-toolbar-dropdown-menu',
              name:'customColumnChooserButton'
            });
        });
      }

      if (options.stateStoring &&
        options.stateStoring.enabled &&
        options.stateStoring.type === "localStorage") {

        var customSaveState = function(state) {
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

      return options;
    }

    return {
      create: create,
    };
  }
})();
