;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridOptionsHelpers', GridOptionsHelpers);

  /** @ngInject */
  function GridOptionsHelpers() {
    function addToolbarHandler(options, cb) {
      var prevFn = options.onToolbarPreparing;

      options.onToolbarPreparing = function (e) {
        cb(e);

        if (prevFn) {
          prevFn(e);
        }
      };
    }

    function addEditors(options, cb) {
      var prevFn = options.onEditorPreparing;

      options.onEditorPreparing = function (e) {
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

    function generateGridLsKey(storageKey, schemaName) {
      return storageKey + '_dxgrid_' + schemaName;
    }

    return {
      addToolbarHandler: addToolbarHandler,
      refreshGrid: refreshGrid,
      generateGridLsKey: generateGridLsKey,
      addEditors: addEditors,
    };
  }
})();
