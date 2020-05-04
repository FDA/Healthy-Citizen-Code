;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridOptionsHelpers', GridOptionsHelpers);

  /** @ngInject */
  function GridOptionsHelpers() {
    function addToolbarHandler(options, cb) {
      var args = ['onToolbarPreparing', options, cb];
      registerDxEvent.apply(null, args);
    }

    function onEditorPreparing(options, cb) {
      var args = ['onEditorPreparing', options, cb];
      registerDxEvent.apply(null, args);
    }

    function onOptionChanged(options, cb) {
      var args = ['onOptionChanged', options, cb];
      registerDxEvent.apply(null, args);
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
      addToolbarHandler: addToolbarHandler,
      refreshGrid: refreshGrid,
      generateGridLsKey: generateGridLsKey,
      onEditorPreparing: onEditorPreparing,
      onOptionChanged: onOptionChanged,
      getVisibleColumnNames: getVisibleColumnNames,
      getLoadOptions: getLoadOptions,
    };
  }
})();
