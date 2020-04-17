;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('PrintTableBuilder', PrintTableBuilder);

  /** @ngInject */
  function PrintTableBuilder(
    HtmlCellRenderer,
    AdpUnifiedArgs
  ) {
    return {
      build: build,
    }

    function build(schema, records) {
      var tableStyles = 'width: 100%; font-family: Helvetica, Arial, sans-serif;'
      return [
        buildTitle(schema.fullName),
        '<table border="1" cellspacing="0" cellpadding="3" style="' + tableStyles  + '">',
        buildHeads(schema.fields),
        buildBody(schema, records),
        '</table>',
      ].join('');
    }

    function buildTitle(title) {
      return '<h1 style="font-size: 24px; margin: 10px 0;">' + title + '</h1>';
    }

    function buildHeads(fields) {
      var heads = '';
      forEachField(fields, function (field) {
        heads += '<td>' + field.fullName + '</td>';
      });

      return '<thead><tr>' + heads +'</tr></thead>';
    }

    function buildBody(schema, records) {
      var body = '';
      records.forEach(function (record) {
        var row = '<tr>';

        forEachField(schema.fields, function (field) {
          var args = getArgs(field, schema, record);
          row += '<td>' + HtmlCellRenderer(args)(args) + '</td>';
        });

        body += row + '</tr>';
      });

      return body;
    }

    function forEachField(fields, cb) {
      _.keys(fields).forEach(function (key) {
        var field = fields[key];
        if (!_.get(field, 'showInDatatable')) {
          return;
        }

        cb(field);
      });
    }

    function getArgs(field, schema, recordData) {
      var args = AdpUnifiedArgs.getHelperParamsWithConfig({
        path: field.fieldName,
        formData: recordData,
        schema: schema,
      });

      args.params = { asText: true };

      return args;
    }
  }
})();
