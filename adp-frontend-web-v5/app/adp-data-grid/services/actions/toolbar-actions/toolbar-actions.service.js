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
    PrintAction
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
        addRowButton: {},
        printButton: {},
        gridViewButton: {},
        quickFiltersButton: {},
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

    function printButton(schema) {
      return {
        name: "printButton",
        widget: "dxButton",
        options: {
          icon: 'print',
          stylingMode: 'text',
          onClick: function () {
            PrintAction(schema, GridOptionsHelpers.getLoadOptions());
          },
        },
      }
    }
  }
})();
