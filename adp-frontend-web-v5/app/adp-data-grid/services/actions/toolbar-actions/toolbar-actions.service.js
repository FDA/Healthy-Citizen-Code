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
    return function (options, schema) {
      GridOptionsHelpers.addToolbarHandler(options, function (e) {
        var buttons = _.compact([printButton(schema, e), createButton(schema)]);
        Array.prototype.push.apply(e.toolbarOptions.items, buttons);
      });
    }

    function createButton(schema) {
      var hasPermissions = _.get(schema, 'actions.fields.create', null);
      if (_.isNil(hasPermissions)) {
        return;
      }

      return {
        widget: 'dxButton',
        template: '<button type="button" class="btn page-action btn-primary">Create New</button>',
        onClick: function () {
          ActionsHandlers.create(schema)
            .then(function () {
              GridOptionsHelpers.refreshGrid();
            });
        },
        location: 'after',
      }
    }

    function printButton(schema, e) {
      return {
        widget: 'dxButton',
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
        location: 'after',
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
