;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('CellEditorsService', CellEditorsService);

  /** @ngInject */
  function CellEditorsService(
    GridOptionsHelpers,
    GridEditorsFactory,
    AdpSchemaService,
    AdpUnifiedArgs,
    CellEditorsValidationService,
    ACTIONS
  ) {
    return function (options, schema) {
      if (!editingEnabled(schema)) {
        return;
      }

      var permissions = getPermissions(schema.actions);
      options.editing = {
        mode: 'cell',
        refreshMode: 'reshape',
        allowAdding: permissions.allowAdding,
        allowUpdating: permissions.allowUpdating,
      };

      setupColumns(options.columns, schema);

      GridOptionsHelpers.addEditors(options, function (event) {
        var isDataRow = event.parentType === 'dataRow';
        var isSelectionCell = event.type === 'selection';

        if (!isDataRow || isSelectionCell) {
          return;
        }

        enableEditor(event, schema);
      });

      return options;
    };

    function editingEnabled(schema) {
      var editingEnabled = _.get(schema, 'parameters.enableInCellEditing');
      if (!editingEnabled) { return false; }

      var permissions = getPermissions(schema.actions);
      if (!permissions.allowAdding && !permissions.allowUpdating) {
        return false;
      }
      return true;
    }

    function getPermissions(actions) {
      return {
        allowAdding: _.hasIn(actions, 'fields.create'),
        allowUpdating: _.hasIn(actions, 'fields.update'),
      };
    }

    function setupColumns(columns, schema) {
      columns.forEach(function (column) {
        var field = schema.fields[column.dataField];

        if (_.isNil(field)) {
          return;
        }

        column.allowEditing = isFieldEditable(field);
        column.allowEditing && (column.validationRules = CellEditorsValidationService.getValidators(field));
      });
    }

    function isFieldEditable(field) {
      var checks = {
        enabled: function () {
          return !_.get(field, 'parameters.enableInCellEditing');
        },
        hasDynamicDependency: function () {
          return _.isString(field.show) || _.isString(field.required);
        },
        isSyntheticField: function () {
          return !!field.synthesize || !!field.formRender;
        },
        unReadable: function () {
          return !_.get(field, 'showInDatatable') && !AdpSchemaService.isReadonly(field);
        }
      }

      var failed = _.some(checks, function (fn) { return fn() });
      return !failed;
    }

    function enableEditor(event, schema) {
      var options = {
        args: unifiedApproachArgs(event, schema),
        onValueChanged: function (editorEvent) {
          event.setValue(editorEvent.value);
        }
      };

      var editorElement = GridEditorsFactory(options);
      event.editorElement.replaceWith(editorElement);
    }

    function unifiedApproachArgs(event, schema) {
      var fieldName = event.dataField;

      return AdpUnifiedArgs.getHelperParamsWithConfig({
        path: fieldName,
        formData: event.row.data,
        action: ACTIONS.UPDATE,
        schema: schema,
      });
    }
  }
})();
