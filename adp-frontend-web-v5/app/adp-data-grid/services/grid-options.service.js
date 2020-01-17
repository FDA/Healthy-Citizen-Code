;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridOptions', GridOptions);

  /** @ngInject */
  function GridOptions(
    GridColumns,
    GridDataSource,
    GridSorting,
    GridActions,
    GridOptionsHelpers,
    AdpNotificationService,
    AdpModalService,
    GridFilters,
    EditorsService,
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
          width: 240,
          placeholder: 'Search...'
        },
      };

      var other = {
        remoteOperations: true,
        twoWayBindingEnabled: false,
        errorRowEnabled: false,
        onDataErrorOccurred: function () {
          this.dataErrorMessage = 'Data Loading Error';
        }
      };

      var options = _.assign(
        {},
        _.cloneDeep(schema.parameters) || {},
        presentation,
        search,
        other
      );

      GridDataSource.create(options, schema);
      GridColumns.create(options, schema);
      GridFilters.create(options, schema);
      EditorsService(options, schema);
      GridSorting.setSortingOptions(options, schema);
      GridActions(options, schema);
      GridFilters.setFiltersFromUrl(options, schema);
      GridExportService(options, schema);

      GridOptionsHelpers.addToolbarHandler(options, function (e) {
        e.toolbarOptions.items.reverse();
      });

      GridOptionsHelpers.addToolbarHandler(options, function (e) {
        e.toolbarOptions.items.unshift(
          {
            widget: 'dxButton',
            options: {
              icon: 'detailslayout',
              hint: 'Grid view save/restore',
              onClick: function () {
                AdpModalService
                  .createModal('adpGridViewManager', {
                    gridComponent: e.component,
                    schema: schema,
                  })
                  .result
              }
            },
            location: 'after'
          });
      });

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
