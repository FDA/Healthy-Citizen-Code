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
    HtmlCellRenderer
  ) {
    function create(options, schema) {
      var gridFields = GridSchema.getFieldsForGrid(schema);

      options.columns = schemaToColumn(gridFields, schema);

      if (options.grouping) {
        addGroupingOptions(options, schema);
      }

      return options;
    }

    function schemaToColumn(gridFields, schema) {
      return gridFields.map(function (field) {
        return createColumn(field, schema);
      });
    }

    function createColumn(field, schema) {
      var column = {
        cssClass: 'name-' + field.fieldName,
        caption: field.fullName || field.fieldName,
        dataField: field.fieldName,
        visible: field.showInDatatable && _.get(field, 'parameters.visible', true),
        showInColumnChooser: field.showInDatatable,
        hidingPriority: field.responsivePriority,
        minWidth: field.width,
        filterOperations: FilterOperation.get(field),
        allowFiltering: GridFilterHelpers.filteringAllowedForField(field),
        calculateFilterExpression: CustomFilterExpression(field),
        selectedFilterOperation:  FilterOperation.getSelected(field),
        cellTemplate: function (container, cellInfo) {
          container.append(getTemplateForField(field, schema, cellInfo.data));
        }
      };

      customizeBetweenOperationTextForColumn(column, field, schema);

      return column;
    }

    function getTemplateForField(field, schema, rowData) {
      var args = getTemplateArguments(field, schema, rowData);
      var templateFn = HtmlCellRenderer(args);

      return templateFn(args);
    }

    function customizeBetweenOperationTextForColumn(column, field, schema) {
      if (!FilterOperation.hasBetweenOperation(field.type)) {
        return;
      }

      column.customizeText = function (event) {
        return event.target === 'filterRow' ? getTextForHeaderFilter(field, schema, event.value) : event.valueText;
      };
    }

    function getTextForHeaderFilter(field, schema, fieldValue) {
      var rowData = {};
      rowData[field.fieldName] = fieldValue;

      var tpl = getTemplateForField(field, schema, rowData);

      return tpl === GRID_FORMAT.EMPTY_VALUE ?
        GRID_FORMAT.NOT_SET_FILTER_VALUE :
        tpl;
    }

    function addGroupingOptions(options, schema) {
      options.columns.forEach(function (column) {
        var field = schema.fields[column.dataField];
        if (!field) {
          return;
        }
        var grp = _.get(field, "parameters.grouping", {});
        _.assign(column, grp);
      });

      options.remoteOperations = { groupPaging: true };
    }

    function getTemplateArguments(field, schema, recordData) {
      return AdpUnifiedArgs.getHelperParamsWithConfig({
        path: field.fieldName,
        formData: recordData,
        action: ACTIONS.VIEW,
        schema: schema,
      });
    }

    return {
      create: create,
    }
  }
})();
