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
    GridModalEditors,
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

      GridOptionsHelpers.onEditorPreparing(options, function (event) {
        var isDataRow = event.parentType === 'dataRow';
        var isSelectionCell = event.type === 'selection';

        if (!isDataRow || isSelectionCell) {
          return;
        }

        var options = getOptions(event, schema);
        if (GridModalEditors.isModalEditor(options.args.modelSchema.type)) {
          enableModalEditor(event, options);
        } else {
          enableEditor(event.editorElement, options);
        }
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
        if (column.allowEditing) {
          column.validationRules = CellEditorsValidationService.getValidators(field);
        }
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

    function enableEditor(element, options) {
      var editorElement = GridEditorsFactory(options);
      element.replaceWith(editorElement);
    }

    function enableModalEditor(event, options) {
      event.editorElement.replaceWith('editing');

      if (event.row.isNewRow) {
        return insertWithModal(event, options);
      } else {
        return editWithModal(event, options);
      }
    }

    function insertWithModal(event, options) {
      event.component.cancelEditData();

      function afterSubmit(newValue) {
        var data = {};
        data[options.args.modelSchema.fieldName] = newValue;

        saveData(data);
      }

      function onCancel() {
        saveData({});
      }

      function saveData(data) {
        event.component.getDataSource().store().insert(data)
          .then(function () {
            event.component.refresh(true);
          });
      }

      return GridModalEditors.call(options, afterSubmit, onCancel);
    }

    function editWithModal(event, options) {
      function afterSubmit(newValue) {
        event.setValue(newValue);
        event.component.saveEditData();
      }

      function onCancel() {}

      return GridModalEditors.call(options, afterSubmit, onCancel);
    }

    function getOptions(event, schema) {
      return {
        args: unifiedApproachArgs(event, schema),
        onValueChanged: function (editorEvent) {
          var isEmpty = _.isArray(editorEvent.value) ?
            _.isEmpty(editorEvent.value) :
            _.isNil(editorEvent.value);

          event.setValue(isEmpty ? null : editorEvent.value);
        }
      };
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
