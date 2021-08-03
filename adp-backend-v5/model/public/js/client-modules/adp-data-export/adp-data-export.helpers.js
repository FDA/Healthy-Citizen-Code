(function () {
  'use strict';

  angular.module('app.adpDataExport')
    .factory('GridExportHelpers', GridExportHelpers);

  /** @ngInject */
  function GridExportHelpers(
    APP_CONFIG,
    AdpSchemaService,
    GraphqlHelper
  ) {
    var PREF_TYPE_LS_KEY = 'gridPrefExportFormat';

    function gridVisibleColumns(grid) {
      return _.compact(
        _.map(grid.getVisibleColumns(), function (row) {
          return row.allowExporting && row.dataField;
        })
      );
    }

    function gridFilterCondition(params) {
      var hasRowSelection = params.configParams.rowsToExport === 'selected';
      var filter = [];

      if (hasRowSelection) {
        var selectedRows = params.grid.getSelectedRowKeys();

        if (selectedRows.length) {
          _.each(selectedRows, function (row) {
            filter.push(['_id', '=', row._id]);
            filter.push('or');
          });
          filter.pop();
        }
      } else {
        var buildFilter = params.customGridOptions && _.clone(params.customGridOptions.value('filterBuilder'));

        filter = GraphqlHelper.combineFilters(params.schema, params.grid.getCombinedFilter(), buildFilter);
      }

      return filter || [];
    }

    function setPrefType(val) {
      localStorage.setItem(PREF_TYPE_LS_KEY, val);
    }

    function getPrefType() {
      return localStorage.getItem(PREF_TYPE_LS_KEY);
    }

    function getExportFormats() {
      var exportsSchema = AdpSchemaService.getSchemaByName('_exports');

      return exportsSchema.fields.exportType.list;
    }

    function guessTimeZone() {
      try {
        return Intl.DateTimeFormat()
          .resolvedOptions().timeZone;
      } catch (e) {
        return '';
      }
    }

    return {
      getExportFormats: getExportFormats,
      getPrefType: getPrefType,
      guessTimeZone: guessTimeZone,
      setPrefType: setPrefType,
      gridFilterCondition: gridFilterCondition,
      gridVisibleColumns: gridVisibleColumns
    };
  }
})();
