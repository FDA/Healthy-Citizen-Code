;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridToolbarActions', GridToolbarActions);

  /** @ngInject */
  function GridToolbarActions(
    ActionsHandlers,
    GridActionsTemplate,
    GridOptionsHelpers,
    AdpBrowserService
  ) {
    function sortByName(e) {
      var commonToolbarItemOptions = {
        location: "after",
        locateInMenu: "auto",
      };
      var itemsOrder = {
        createButton: {locateInMenu: "never", location: "before"},
        groupPanel: {location: "before"},
        searchPanel: {},
        printButton: {},
        gridViewButton: {},
        exportButton: {},
        importButton: {},
        customColumnChooserButton: {},
      };
      var items = e.toolbarOptions.items;
      var newItems = [];

      _.each(itemsOrder, function (itemAddOptions, name) {
        var index = _.findIndex(items, function (x) {
          return x.name === name
        });
        var item = items.splice(index, 1)[0];
        if (item) {
          var options = Object.assign({}, commonToolbarItemOptions, itemAddOptions, item);
          options.cssClass =  "adp-grid-toolbar-item " + (options.cssClass || '');
          newItems.push( options);
        }
      });

      if (items.length) {
        console.warn("Elements of toolbar have no names to be sorted: ", items);

        newItems.unshift.apply(this, _.map(items, function (item) {
          return Object.assign({}, commonToolbarItemOptions, item);
        }))
      }

      e.toolbarOptions.items = newItems;
    }

    function removeUnnecessary(e) {
      // we have to remove columnChooser from toolbar because we add custom one. Disabling columnChooser by grid config is not an option
      e.toolbarOptions.items = _.filter(e.toolbarOptions.items, function (item) {
        return item.name !== "columnChooserButton"
      })
    }

    function addPrintAndCreate(options, schema) {
      GridOptionsHelpers.addToolbarHandler(options, function (e) {
        var buttons = _.compact([printButton(schema, e), createButton(schema)]);
        Array.prototype.unshift.apply(e.toolbarOptions.items, buttons);
      });
    }

    return {
      addPrintAndCreate: addPrintAndCreate,
      sortByName: sortByName,
      removeUnnecessary: removeUnnecessary
    };

    function createButton(schema) {
      var hasPermissions = _.get(schema, 'actions.fields.create', null);
      if (_.isNil(hasPermissions)) {
        return;
      }

      return {
        name: "createButton",
        widget: "dxButton",
        template: '<button type="button" class="btn page-action btn-primary">Create New</button>',
        onClick: function () {
          ActionsHandlers.create(schema)
            .then(function () {
              GridOptionsHelpers.refreshGrid();
            });
        },
      }
    }

    function printButton(schema, e) {
      return {
        name: "printButton",
        widget: "dxButton",
        options: {
          icon: 'print',
          stylingMode: 'text',
          onClick: function () {
            var gridInstance = e.component;

            var cache = createHidingPriorityCache(gridInstance);
            removeHidingPriority(gridInstance);
            $(document.body).addClass('js-print-datatable');

            addEventListenersForPrinter(gridInstance, cache);

            window.print();
          },
        },
      }
    }

    function createHidingPriorityCache(gridInstance) {
      var columns = gridInstance.option('columns');
      return _.map(columns, function (column) {
        return column.hidingPriority;
      });
    }

    function removeHidingPriority(gridInstance) {
      var columns = gridInstance.option('columns');

      gridInstance.beginUpdate();

      _.each(columns, function (column, index) {
        gridInstance.columnOption(index, 'hidingPriority', undefined);
      });
      gridInstance.columnOption('actions', 'visible', false);

      gridInstance.endUpdate();
    }

    function restoreHidingPriority(gridInstance, cache) {
      gridInstance.beginUpdate();

      _.each(cache, function (hidingPriority, index) {
        gridInstance.columnOption(index, 'hidingPriority', hidingPriority);
      });
      gridInstance.columnOption('actions', 'visible', true);

      gridInstance.endUpdate();
    }

    function addEventListenersForPrinter(gridInstance, cache) {
      var mediaQueryList;
      // skipping firefox here, because it matchMedia for print is not working
      // https://bugzilla.mozilla.org/show_bug.cgi?id=774398
      if (window.matchMedia && !AdpBrowserService.isFirefox()) {
        mediaQueryList = window.matchMedia('print');
        mediaQueryList.addListener(mqlHandler);
        console.log('matchMedia added');
      } else {
        window.onafterprint = afterPrint;
        console.log('onafterprint added');
      }

      function afterPrint(mql) {
        $(document.body).removeClass('js-print-datatable');
        restoreHidingPriority(gridInstance, cache);
        removeListeners(mql);
        console.log('afterPrint');
      }

      function removeListeners(mql) {
        window.onafterprint = null;
        mediaQueryList && mediaQueryList.removeListener(mqlHandler);
      }

      function mqlHandler(mql) {
        if(!mql.matches) {
          afterPrint(mql);
        }
      }
    }
  }
})();
