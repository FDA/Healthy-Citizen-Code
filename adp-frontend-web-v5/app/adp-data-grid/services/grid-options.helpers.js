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

    function refreshGrid() {
      var instance = gridInstance();
      instance.refresh();
    }

    function gridInstance() {
      var gridInstance = $('[dx-data-grid]');
      return gridInstance.dxDataGrid('instance');
    }

    function getVisibleColumnNames() {
      var instance = gridInstance()
      var result = []

      for (var i = 0; i < instance.columnCount(); i++) {
        var columnName = instance.columnOption(i, 'dataField')

        if (instance.columnOption(i, 'visible') && columnName) {
          result.push(instance.columnOption(i, 'dataField'))
        }
      }

      return result;
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
    };
  }
})();
