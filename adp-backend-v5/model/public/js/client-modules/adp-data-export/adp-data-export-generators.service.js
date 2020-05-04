(function () {
  'use strict';

  angular.module('app.adpDataExport').factory('GridExportGenerators', GridExportGenerators);

  /** @ngInject */
  function GridExportGenerators(ClientError) {
    var XML_INDENT = 2;

    function jsonGenerator(wb) {
      return Promise.resolve(JSON.stringify(workbookToJson(wb), null, 4));
    }

    function xmlGenerator(wb) {
      var obj = { rows: workbookToJson(wb) };

      return Promise.resolve('<?xml version="1.0" encoding="utf-8">' + objToXml(obj, 0) + '\n</xml>');
    }

    function workbookToJson(workbook) {
      var stack = [{ __items: [] }];
      var cursor = stack[0];

      workbook.eachSheet(function (sheet) {
        // Required as sheets are listed with random offset internally.

        if (!sheet.rowCount) {
          throw new ClientError('At least one row is required');
        }

        if (!sheet._rows[0].cellCount) {
          throw new ClientError('At least one visible column is required');
        }

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

      row.eachCell({ includeEmpty: true }, function (cell) {
        var schemaCell = cell._schemaCell;
        var field = schemaCell.column.dataField;
        var value = schemaCell.value;

        if (field && value !== null) {
          obj[field] = value;
        }
      });

      var rowId = row.getCell(1)._schemaCell.data._id;

      if (rowId) {
        obj._id = rowId;
      }

      return obj;
    }

    function objToXml(obj, ind) {
      var xml = '';

      if (typeof obj == 'string' || typeof obj == 'number') {
        return obj;
      }

      _.each(obj, function (item, key) {
        xml += '\n' + indent(ind) + '<' + key + '>';

        if (item instanceof Array) {
          // xml += "\n" + indent(ind);
          item.forEach(function (elem) {
            //   xml += "<item>" + objToXml(new Object(elem)) + "</item>";
            xml += '\n' + indent(ind + XML_INDENT) + '<item>' + objToXml(elem, ind + XML_INDENT * 2) + '</item>';
          });

          if (item.length) {
            xml += '\n' + indent(ind);
          }
        } else if (typeof item == 'object') {
          //   xml += objToXml(new Object(item));
          xml += objToXml(item, ind + XML_INDENT) + '\n' + indent(ind);
        } else {
          xml += item;
        }

        xml += '</' + key + '>'; //\n" + indent(ind);
      });

      return xml; //.replace(/<\/?[0-9]{1,}>/g, '');
    }

    function indent(num) {
      return _.repeat(' ', num);
    }

    return {
      jsonGenerator: jsonGenerator,
      xmlGenerator: xmlGenerator,
    };
  }
})();
