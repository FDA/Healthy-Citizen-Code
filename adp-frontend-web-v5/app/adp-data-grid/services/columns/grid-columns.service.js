;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridColumns', GridColumns);

  /** @ngInject */
  function GridColumns(
    AdpSchemaService,
    GridSchema,
    AdpUnifiedArgs,
    ACTIONS,
    GridFilterHelpers,
    CustomFilterExpression,
    FilterOperation,
    FilterUrlParser,
    GRID_FORMAT,
    HtmlCellRenderer,
    GridTableActions,
    GridColumnsHelpers,
    GridSorting
  ) {
    return function (options, schema, customGridOptions) {
      var gridFields = GridSchema.getFieldsForGrid(schema);

      options.columns = schemaToColumn(gridFields, schema);
      GridTableActions(options, schema, customGridOptions);

      GridColumnsHelpers.setWidthToColumns(options, schema);
      GridSorting.setSortingOptions(options, schema);

      return options;
    }

    function schemaToColumn(gridFields, schema) {
      return gridFields.map(function (field) {
        return createColumn(field, schema);
      });
    }

    function createColumn(field, schema) {
      var isFilteringAllowed = GridFilterHelpers.filteringAllowedForField(field);
      var column = {
        cssClass: 'name-' + field.fieldName,
        caption: field.fullName || field.fieldName,
        dataField: field.fieldName,
        visible: field.showInDatatable && _.get(field, 'parameters.visible', true),
        showInColumnChooser: field.showInDatatable,
        hidingPriority: field.responsivePriority,
        filterOperations: FilterOperation.get(field),
        allowFiltering: field.showInDatatable && isFilteringAllowed,
        allowSearch: field.showInDatatable && isFilteringAllowed && isSearchAllowed(field),
        calculateFilterExpression: CustomFilterExpression(field),
        selectedFilterOperation:  FilterOperation.getSelected(field),
        cellTemplate: function (container, cellInfo) {
          container.append(getTemplateForField(field, schema, cellInfo.data));
        },
        groupCellTemplate: function (container, cellInfo) {
          var rowData = {};
          var summaryText = "";

          if (cellInfo.summaryItems) {
            summaryText = _.map(cellInfo.summaryItems,
              function (item) {
                if (item.displayFormat) {
                  return item.displayFormat.replace("{0}", item.value);
                } else {
                  return item.summaryType[0].toUpperCase() + item.summaryType.substr(1) + " of "
                    + item.columnCaption + ": " + item.value;
                }
              })
              .join(", ");
          }

          rowData[field.fieldName] = cellInfo.data.key;

          var tpl = "<p>" + field.fullName + ": " + getTemplateForField(field, schema, rowData) +
            (summaryText ? ". " + summaryText : "") + " </p>";

          if (cellInfo.data.isContinuationOnNextPage) {
            tpl += "<p>(Continues on the next page)</p>";
          }

          container.append(tpl);
        },
        customizeText: function (event) {
          if (
            (FilterOperation.hasBetweenOperation(field.type) && event.target === 'filterRow')
            || _.includes(['filterPanel', 'filterBuilder'], event.target)
          ) {
            var args = getCustomTextArgs(field, schema, event.value);
            var filterContent = HtmlCellRenderer(args)(args);

            return filterContent === GRID_FORMAT.EMPTY_VALUE ?
              GRID_FORMAT.NOT_SET_FILTER_VALUE :
              filterContent;
          } else {
            return event.value;
          }
        },
      };

      return column;
    }

    function getTemplateForField(field, schema, rowData) {
      var args = getTemplateArguments(field, schema, rowData);
      var templateFn = HtmlCellRenderer(args);

      return templateFn(args);
    }

    function getTemplateArguments(field, schema, recordData) {
      return AdpUnifiedArgs.getHelperParamsWithConfig({
        path: field.fieldName,
        formData: recordData,
        action: ACTIONS.VIEW,
        schema: schema,
      });
    }

    function getCustomTextArgs(field, schema, value) {
      var rowData = {};
      rowData[field.fieldName] = value;
      var args = getTemplateArguments(field, schema, rowData);
      args.params = { asText: true };

      return args;
    }

    function isSearchAllowed(field) {
      var disallowedTypes = ["ObjectID"];
      var type = AdpSchemaService.getFieldType(field);

      return disallowedTypes.indexOf(type) === -1;
    }
  }
})();
