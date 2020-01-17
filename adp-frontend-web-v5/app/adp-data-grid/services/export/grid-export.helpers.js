;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridExportHelpers', GridExportHelpers);

  /** @ngInject */
  function GridExportHelpers(
    AdpSchemaService,
    AdpUnifiedArgs,
    HtmlCellRenderer,
    $timeout
  ) {
    var PREF_TYPE_LS_KEY = 'gridPrefExportFormat';
    var XML_INDENT = 2;
    var exportFormatConfig = {
      xlsx: {
        mime: 'application/octet-stream',
        processor: function (wb) {
          return wb.xlsx.writeBuffer()
        },
        useCellRenderers: true
      },
      csv: {
        mime: 'text/csv',
        processor: function (wb) {
          return wb.csv.writeBuffer()
        },
        useCellRenderers: true
      },
      xml: {
        mime: 'text/xml',
        processor: xmlGenerator
      },
      json: {
        mime: 'text/json',
        processor: jsonGenerator
      },
    };

    function jsonGenerator(wb) {
      return Promise.resolve(JSON.stringify(workbookToJson(wb), null, 4));
    }

    function xmlGenerator(wb) {
      var obj = {rows: workbookToJson(wb)};

      return Promise.resolve(
        '<?xml version="1.0" encoding="utf-8">' + objToXml(obj, 0) + '\n</xml>'
      );
    }

    function workbookToJson(workbook) {
      var stack = [{__items: []}];
      var cursor = stack[0];

      workbook.eachSheet(function (sheet) {  // Required as sheets are listed with random offset internally.
        sheet._rows.forEach(function (row) {
          var cell = row._cells[0]._schemaCell;
          var rowType = cell.rowType;

          if (rowType !== 'header') {
            if (rowType === 'group') {
              while (stack.length > cell.column.groupIndex + 1) {
                var top = stack.pop();
                cursor = stack[stack.length - 1];
                cursor.__items.push(top);
              }
              var group = {};
              group[cell.column.dataField] = cell.value;
              group.__items = [];
              stack.push(group);
              cursor = group;
            } else {
              cursor.__items.push(rowToObj(row));
            }
          }
        });

        cursor = stack.pop();

        while (stack.length > 0) {
          var top = stack.pop();

          top.__items.push(cursor);
          cursor = top;
        }
      });

      return cursor.__items;
    }

    function rowToObj(row) {
      var obj = {};

      row.eachCell({includeEmpty: true}, function (cell) {
        var schemaCell = cell._schemaCell;
        var field = schemaCell.column.dataField;
        var value = schemaCell.value;

        if (field && value !== null) {
          obj[field] = value;
        }
      });

      return obj;
    }

    function objToXml(obj, ind) {
      var xml = '';

      if (typeof obj == "string" || typeof obj == "number") {
        return obj;
      }

      _.each(obj, function (item, key) {
        xml += "\n" + indent(ind) + "<" + key + ">";

        if (item instanceof Array) {
          // xml += "\n" + indent(ind);
          item.forEach(function (elem) {
            //   xml += "<item>" + objToXml(new Object(elem)) + "</item>";
            xml += "\n" + indent(ind + XML_INDENT) + "<item>" + objToXml(elem, ind + XML_INDENT * 2) + "</item>";
          });

          if (item.length) {
            xml += "\n" + indent(ind);
          }
        } else if (typeof item == "object") {
          //   xml += objToXml(new Object(item));
          xml += objToXml(item, ind + XML_INDENT) + "\n" + indent(ind);
        } else {
          xml += item;
        }

        xml += "</" + key + ">";//\n" + indent(ind);
      });

      return xml;//.replace(/<\/?[0-9]{1,}>/g, '');
    }

    function indent(num) {
      return " ".repeat(num)
    }

    function saveData(buffer, fileFormat, fileName) {
      var a = document.createElement("a");
      var url = window.URL.createObjectURL(new Blob([buffer], {type: getMime(fileFormat)}), fileName);

      document.body.appendChild(a);
      a.style = "display: none";
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);

      $timeout(function () { //Just to make sure no special effects occurs
        document.body.removeChild(a);
      }, 5000);
    }

    function getMime(type) {
      return exportFormatConfig[type].mime;
    }

    function getProcessor(type) {
      return exportFormatConfig[type].processor;
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
            schema: schema
          });

          args.params = {asText: true};

          var renderer = HtmlCellRenderer(args);

          options.excelCell.value = renderer(args);
        }
      }
    }

    return {
      saveData: saveData,
      getProcessor: getProcessor,
      getCellCustomizer: getCellCustomizer,
      getPrefType: getPrefType,
      setPrefType: setPrefType
    }
  }
})();
