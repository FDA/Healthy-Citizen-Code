;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridColumns', GridColumns);

  /** @ngInject */
  function GridColumns(
    AdpSchemaService,
    GridSchema,
    GridFilterHelpers,
    CustomFilterExpression,
    FilterOperation,
    GRID_FORMAT,
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
        var column = createColumn(field, schema);
        injectColumnOptionsFromSchema(column, field.parameters);

        return column;
      });
    }

    function injectColumnOptionsFromSchema(column, parameters) {
      var helpersPaths = ['headerFilter.dataSource', 'calculateFilterExpression'];
      var parametersToMerge = _.omit(parameters, helpersPaths);
      _.merge(column, parametersToMerge);
    }

    function createColumn(field, schema) {
      var isFilteringAllowed = GridFilterHelpers.filteringAllowedForField(field);
      var column = {
        cssClass: ['name-' + field.fieldName, 'adp-grid-cell-' + _.kebabCase(field.type)].join(' '),
        caption: field.fullName || field.fieldName,
        dataField: field.fieldName,
        visible: field.showInDatatable && _.get(field, 'parameters.visible', true),
        showInColumnChooser: field.showInDatatable,
        hidingPriority: field.responsivePriority,
        filterOperations: FilterOperation.get(field),
        allowFiltering: field.showInDatatable && isFilteringAllowed,
        calculateFilterExpression: CustomFilterExpression(field, schema),
        selectedFilterOperation:  FilterOperation.getSelected(field),
        cellTemplate: function (container, cellInfo) {
          container.append(GridColumnsHelpers.getTemplateForField(field, schema, cellInfo.data));
        },
        groupCellTemplate: function (container, cellInfo) {
          // refactor: it's too complex, better to keep inside some service
          var summaryText = "";
          var findFormat = function (columnName) {
            var summaryItem = _.find(cellInfo.summaryItems, function (item) {
              return columnName === item.column;
            });

            return _.get(summaryItem, 'valueFormat', null);
          };

          var formatValue = function (val, columnName) {
            var fieldSchema = schema.fields[columnName];
            var format = findFormat(columnName) || 'currency';

            if (fieldSchema.type === 'Currency') {
              var formatted = DevExpress.localization.formatNumber(val, format);
              return _.isNil(formatted) ? GRID_FORMAT.EMPTY_VALUE : formatted;
            }

            var rowData = {};
            rowData[fieldSchema.fieldName] = val;
            var argsArray = [fieldSchema, schema, rowData];

            return GridColumnsHelpers.getTextTemplateForField.apply(null, argsArray);
          };

          if (cellInfo.summaryItems) {
            summaryText = _.map(cellInfo.summaryItems,
              function (item) {
                if (item.displayFormat) {
                  return item.displayFormat.replace("{0}", formatValue(item.value, item.column));
                } else {
                  return _.startCase(item.summaryType) + " of "
                    + item.columnCaption + ": " + formatValue(item.value, item.column);
                }
              })
              .join(", ");
          }

          var tpl = "<p>" + field.fullName + ": " + formatValue(cellInfo.data.key, cellInfo.column.dataField) +
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
            var rowData = {};
            rowData[field.fieldName] = event.value;
            var filterContent = GridColumnsHelpers.getTextTemplateForField(field, schema, rowData);

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
  }
})();
