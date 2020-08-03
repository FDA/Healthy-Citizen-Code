;(function () {
  "use strict";

  angular
    .module("app.adpDataGrid")
    .factory("GridTypeCellRenderer", GridTypeCellRenderer);

  var GridColumnsHelpers; //initialised on first use to workaround circular dependency

  /** @ngInject */
  function GridTypeCellRenderer(
    $injector,
    GRID_FORMAT,
    GridControlHelper
  ) {
    return {
      render: render,
    };

    function render(args) {
      var $elem = $("<div>");

      GridControlHelper
        .getMergedData(args.fieldSchema.table, args.row, args.action)
        .then(function (data) {
          renderReadonlyTable($elem, data.data, args.fieldSchema)
        })

      return $elem;

      function renderReadonlyTable($elem, data) {
        if (_.isNil(data) || _.isEmpty(data)) {
          $elem.text( GRID_FORMAT.EMPTY_VALUE );
          return;
        }

        var mergedSchema = GridControlHelper.mergeSchema(args.fieldSchema.table);
        var columnsToRender = getVisibleColumns(mergedSchema);
        var $thead = $("<thead>");
        var $tbody = $("<tbody>");

        if (!GridColumnsHelpers) { GridColumnsHelpers = $injector.get('GridColumnsHelpers'); }

        $thead.append("<th>" + _.map(columnsToRender, function (field) {
          return field.fullName
        }).join("</th><th>") + "</th>");

        _.each(data, function (row) {
          var $tr = $("<tr>");

          _.each(columnsToRender, function (field) {
            var $td = $("<td>");

            $td.append(GridColumnsHelpers.getTextTemplateForField(field, mergedSchema, row));
            $tr.append($td);
          })

          $tbody.append($tr);
        })

        $elem.append($("<table class='adp-grid-control-table'>").append($thead).append($tbody));
      }

      function getVisibleColumns(schema) {
        return _.filter(schema.fields, function(field) { return field.showInDatatable});
      }
    }
  }
})();
