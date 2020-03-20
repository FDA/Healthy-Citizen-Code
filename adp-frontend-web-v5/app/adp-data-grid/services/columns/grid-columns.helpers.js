;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridColumnsHelpers', GridColumnsHelpers);

  /** @ngInject */
  function GridColumnsHelpers() {
    return {
      setWidthToColumns: setWidthToColumns,
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
      }
    }
  }
})();
