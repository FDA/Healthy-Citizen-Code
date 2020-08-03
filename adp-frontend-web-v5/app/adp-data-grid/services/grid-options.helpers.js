;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridOptionsHelpers', GridOptionsHelpers);

  /** @ngInject */
  function GridOptionsHelpers() {
    function getDxEventHandler(handlerName){
      return function(options, cb) {
        var args = [handlerName, options, cb];
        registerDxEvent.apply(null, args);
      }
    }

    function registerDxEvent(name, options, cb) {
      var prevFn = options[name];

      options[name] = function (e) {
        cb(e);

        if (prevFn) {
          prevFn(e);
        }
      };
    }

    function refreshGrid(instance) {
      var instance = instance || gridInstance();
      instance.refresh();
    }

    function gridInstance() {
      var gridInstance = $('.multi-record [dx-data-grid]');
      return gridInstance.dxDataGrid('instance');
    }

    function getLoadOptions(instance) {
      var instance = instance || gridInstance();
      var loadOptions = _.cloneDeep(instance.getDataSource().loadOptions());
      loadOptions.filter = instance.getCombinedFilter();

      var selectedRows = instance.getSelectedRowKeys();

      if (selectedRows.length) {
        loadOptions.filter = [];
        _.each(selectedRows, function (row) {
          loadOptions.filter.push(["_id", "=", row._id]);
          loadOptions.filter.push("or");
        });
        loadOptions.filter.pop();
      }

      return loadOptions;
    }

    function getVisibleColumnNames(instance) {
      var instance = instance || gridInstance();

      var result = instance.getVisibleColumns().map(function (c) {
        return c.dataField;
      });

      return _.compact(result);
    }

    function generateGridLsKey(storageKey, schemaName) {
      return storageKey + '_dxgrid_' + schemaName;
    }

    return {
      addToolbarHandler: getDxEventHandler('onToolbarPreparing'),
      onEditorPreparing: getDxEventHandler('onEditorPreparing'),
      onRowPrepared: getDxEventHandler('onRowPrepared'),
      onOptionChanged: getDxEventHandler('onOptionChanged'),
      refreshGrid: refreshGrid,
      generateGridLsKey: generateGridLsKey,
      getVisibleColumnNames: getVisibleColumnNames,
      getLoadOptions: getLoadOptions,
    };
  }
})();
