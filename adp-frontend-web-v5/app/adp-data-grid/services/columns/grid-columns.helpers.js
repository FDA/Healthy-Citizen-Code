;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridColumnsHelpers', GridColumnsHelpers);

  /** @ngInject */
  function GridColumnsHelpers(
    HtmlCellRenderer,
    AdpUnifiedArgs,
    ACTIONS
  ) {
    return {
      setWidthToColumns: setWidthToColumns,
      getTemplateForField: getTemplateForField,
      getTextTemplateForField: getTextTemplateForField,
    };

    function setWidthToColumns(options, schema) {
      options.columns.forEach(function (column) {
        var fieldName = column.dataField;
        var field = column.name === 'actions' ?
          schema.actions :
          schema.fields[fieldName];

        setWidthToColumn(column, field);
      });
    }

    function setWidthToColumn(column, field) {
      if (!field) { return; }

      function parseWidth(value) {
        var percentRe = /^(\d+)%$/;
        if (percentRe.test(value)) {
          return value;
        }

        var pixelsRe = /^(\d+)px$/;
        var parsedValue;
        if (pixelsRe.test(value)) {
          parsedValue = value.match(/^(\d+)px$/)[1]
          return parseInt(parsedValue, 10);
        }

        return parseInt(value, 10);
      }

      var width = parseWidth(field.width);
      if (!_.isNaN(width)) {
        column.width = width;
      }

      var minWidth = parseWidth(_.get(field, 'parameters.minWidth'));
      if (!_.isNaN(minWidth) && (typeof minWidth === 'number')) {
        column.minWidth = minWidth;
      } else if (!_.isNaN(width) && (typeof width === 'number')) {
        column.minWidth = width;
      } else {
        column.minWidth = 100;
      }
    }

    function getTemplateForField(field, schema, rowData) {
      var args = getTemplateArguments(field, schema, rowData);
      return HtmlCellRenderer(args);
    }

    function getTextTemplateForField(field, schema, rowData) {
      var args = getTemplateArguments(field, schema, rowData);
      args.params = { asText: true };
      return HtmlCellRenderer(args);
    }

    function getTemplateArguments(field, schema, recordData) {
      return AdpUnifiedArgs.getHelperParamsWithConfig({
        path: field.fieldName,
        formData: recordData,
        action: ACTIONS.VIEW,
        schema: schema,
      });
    }
  }
})();
