(function () {
  'use strict';

  angular.module('app.adpDataExport').factory('GridExportHelpers', GridExportHelpers);

  /** @ngInject */
  function GridExportHelpers(
    APP_CONFIG,
    GRID_FORMAT,
    AdpSchemaService,
    AdpUnifiedArgs,
    AdpFileDownloader,
    HtmlCellRenderer,
    AdpNotificationService,
    GridExportGenerators,
    $timeout,
    GraphqlCollectionMutator,
    ErrorHelpers
  ) {
    var PREF_TYPE_LS_KEY = 'gridPrefExportFormat';
    var storeEmptyValue;
    var exportFormatConfig = {
      xlsx: {
        native: 'Excel XLSX file',
        mime: 'application/octet-stream',
        processor: function (wb) {
          return wb.xlsx.writeBuffer();
        },
        useCellRenderers: true,
      },
      csv: {
        native: 'CSV file',
        mime: 'text/csv',
        processor: function (wb) {
          return wb.csv.writeBuffer();
        },
        useCellRenderers: true,
        emptyFiller: '',
        commaDotSeparator: '\\;',
      },
      xml: {
        native: 'XML file',
        mime: 'text/xml',
        processor: GridExportGenerators.xmlGenerator,
      },
      json: {
        native: 'JSON file',
        mime: 'text/json',
        processor: GridExportGenerators.jsonGenerator,
      },
      db: {
        native: 'DB collection',
        exporter: serverSideExport,
      },
    };

    function getExporter(gridComponent, schema) {
      return function (options) {
        var method = getExportMethod(options.format);
        setPrefType(options.format);

        options.grid = gridComponent;
        options.schema = schema;

        return method(options);
      };
    }

    function clientSideExport(options) {
      var workbook = new ExcelJS.Workbook();
      var worksheet = workbook.addWorksheet('Main');
      var fileName = options.schema.fullName + '.' + options.format;

      customizeGridEmptyFiller(options);

      return DevExpress.excelExporter
        .exportDataGrid({
          component: options.grid,
          worksheet: worksheet,
          selectedRowsOnly: options.rowsToExport === 'selected',
          customizeCell: getCellCustomizer(options.schema, options.format),
        })
        .then(function () {
          var processor = getProcessor(options.format);

          if (processor) {
            return processor(workbook);
          }

          throw new ClientError('No format processor found for ' + options.format);
        })
        .then(function (buffer) {
          getSaver(options.format)({ buffer: buffer, format: options.format, fileName: fileName }).then(function () {
            AdpNotificationService.notifySuccess('Exported successfully');
          });
          restoreGridEmptyFiller(options); // 'finally()' is not supported by IE11
        })
        .catch(function (err) {
          restoreGridEmptyFiller(options); // 'finally()' is not supported by IE11
          throw err;
        });
    }

    function serverSideExport(options) {
      var datasetsSchema = AdpSchemaService.getSchemaByName('datasets');
      var params = {
        parentCollectionName: options.schema.schemaName,
        filter: gridFilterCondition(options.grid, options.rowsToExport === 'selected'),
        projections: gridVisibleColumns(options.grid),
      };
      var record = {
        name: options.name,
        description: options.description,
      };

      return GraphqlCollectionMutator.cloneDataSet(datasetsSchema, record, params)
        .then(function () {
          AdpNotificationService.notifySuccess('Exported successfully');
        })
        .catch(function (error) {
          ErrorHelpers.handleError(error, 'Unknown error, while trying to export dataset');
          throw error;
        });
    }

    function gridVisibleColumns(grid) {
      return _.compact(
        _.map(grid.getVisibleColumns(), function (row) {
          return row.allowExporting && row.dataField;
        })
      );
    }

    function gridFilterCondition(grid, getSelected) {
      var filter = [];

      if (getSelected) {
        var selectedRows = grid.getSelectedRowKeys();

        if (selectedRows.length) {
          _.each(selectedRows, function (row) {
            filter.push(['_id', '=', row._id]);
            filter.push('or');
          });
          filter.pop();
        }
      } else {
        filter = grid.getCombinedFilter();
      }

      return filter;
    }

    function saveData(params) {
      return AdpFileDownloader(_.extend({ mimeType: getMime(params.format) }, params));
    }

    function getMime(type) {
      return exportFormatConfig[type].mime;
    }

    function getExportMethod(type) {
      return exportFormatConfig[type].exporter || clientSideExport;
    }

    function getProcessor(type) {
      return exportFormatConfig[type].processor;
    }

    function getSaver(type) {
      return exportFormatConfig[type].saver || saveData;
    }

    function customizeGridEmptyFiller(options) {
      storeEmptyValue = GRID_FORMAT.EMPTY_VALUE;
      GRID_FORMAT.EMPTY_VALUE = getEmptyValueFillet(options.format);
    }

    function restoreGridEmptyFiller(options) {
      GRID_FORMAT.EMPTY_VALUE = storeEmptyValue;
      options.grid.repaint();
    }

    function getEmptyValueFillet(type) {
      return _.isUndefined(exportFormatConfig[type].emptyFiller)
        ? GRID_FORMAT.EMPTY_VALUE
        : exportFormatConfig[type].emptyFiller;
    }

    function getPrefType() {
      return localStorage.getItem(PREF_TYPE_LS_KEY);
    }

    function setPrefType(val) {
      localStorage.setItem(PREF_TYPE_LS_KEY, val);
    }

    function getCellCustomizer(schema, exportFormat) {
      return function (options) {
        var gridCell = options.gridCell;

        options.excelCell._schemaCell = gridCell;

        if (exportFormatConfig[exportFormat].useCellRenderers && gridCell.rowType === 'data') {
          var args = AdpUnifiedArgs.getHelperParams({
            path: gridCell.column.dataField,
            formData: gridCell.data,
            schema: schema,
          });

          args.params = getHtmlRenderersParameters(exportFormat);

          var renderer = HtmlCellRenderer(args);

          options.excelCell.value = renderer(args);
        }
      };
    }

    function getHtmlRenderersParameters(type) {
      var params = { asText: true };

      if (!_.isUndefined(exportFormatConfig[type].commaDotSeparator)) {
        params.commaDotSeparator = exportFormatConfig[type].commaDotSeparator;
      }

      return params;
    }

    function getExportFormats() {
      var result = {};

      for (var key in exportFormatConfig) {
        result[key] = exportFormatConfig[key].native;
      }

      return result;
    }

    return {
      getExportFormats: getExportFormats,
      getExporter: getExporter,
      getPrefType: getPrefType,
      gridVisibleColumns: gridVisibleColumns,
    };
  }
})();
