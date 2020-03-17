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

      GridDataSource(options, schema);
      GridColumns(options, schema);
      GridFilters.create(options, schema);
      CellEditorsService(options, schema);

      GridFilters.setFiltersFromUrl(options, schema);
      GridExportService(options, schema);
      GridImportService(options, schema);

      GridOptionsHelpers.addToolbarHandler(options, function (e) {
        e.toolbarOptions.items.push(
          {
            widget: 'dxMenu',
            options: AdpGridViewService.createMenu(schema, e.component),
            cssClass:'adp-grid-toolbar-dropdown-menu',
            name:'gridViewButton'
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
        options.stateStoring.storageKey = GridOptionsHelpers.generateGridLsKey(options.stateStoring.storageKey, schema.schemaName);
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
