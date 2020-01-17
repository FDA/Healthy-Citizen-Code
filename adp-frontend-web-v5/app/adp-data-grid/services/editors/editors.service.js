;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('EditorsService', EditorsService);

  /** @ngInject */
  function EditorsService(
    GridOptionsHelpers,
    GridEditorsFactory,
    AdpSchemaService,
    AdpUnifiedArgs,
    EditorsValidationService,
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

      options.onRowValidating = function (e) {
        e.brokenRules.forEach(function (rule) {
          var field = schema.fields[rule.column.dataField];
          var validatorRule = rule.schemaValidatorRule;

          rule.validator._validationRules[rule.index].message =
            EditorsValidationService.getMessage(e.value, field, validatorRule);
        });
      }

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
        column.allowEditing && (column.validationRules = EditorsValidationService.getValidators(field));
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
        value: event.value,
        onValueChanged: function (editorEvent) {
          // todo: handle empty values and send null
          event.setValue(editorEvent.value);
        }
      };

      var field = schema.fields[event.dataField];
      var editorFn = GridEditorsFactory(field);
      var editor = editorFn(options);

      event.editorElement.replaceWith(editor);
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
