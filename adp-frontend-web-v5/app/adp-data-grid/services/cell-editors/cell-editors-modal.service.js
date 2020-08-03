;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridModalEditors', GridModalEditors);

  /** @ngInject */
  function GridModalEditors(
    AdpModalService,
    AdpUnifiedArgs
  ) {
    return {
      call: call,
      isModalEditor: isModalEditor,
    }

    function call(options, afterSubmit, onCancel) {
      var field = options.args.fieldSchema;

      if (field.type === 'Password') {
        AdpModalService.passwordUpdate(field)
          .then(afterSubmit)
          .catch(onCancel);
      } else {
        return formModal({ args: getArgsSlice(options.args) })
          .then(function (formData) {
            var v = formData[options.args.fieldSchema.fieldName];
            return afterSubmit(_.isEmpty(v) ? null : v);
          })
          .catch(onCancel);
      }
    }

    function formModal(modalOptions) {
      var modalInstance = AdpModalService.createModal('adpCellEditorModal', modalOptions);
      return modalInstance.result;
    }

    function getArgsSlice(args) {
      return AdpUnifiedArgs.getHelperParamsWithConfig({
        path: '',
        action: 'cell-editing-' + args.action,
        formData: getDataSlice(args) || {},
        schema: getSchemaSchema(args),
      });
    }

    function getSchemaSchema(args) {
      var field = args.fieldSchema;
      var fields = {};
      fields[field.fieldName] = field;

      return {
        type: "Schema",
        fields: fields,
        schemaName: args.modelSchema.schemaName,
        fullName: args.modelSchema.fullName,
      }
    }

    function getDataSlice(args) {
      var data = {};
      data[args.fieldSchema.fieldName] = _.cloneDeep(args.data);

      return data;
    }

    function isModalEditor(type) {
      var object = ['Object', 'Array', 'AssociativeArray'];
      var media = ['File', 'Image', 'Audio', 'Video', 'File[]', 'Image[]', 'Audio[]', 'Video[]'];
      var other = ['Location', 'Code', 'Html', 'Password', 'Mixed'];

      var modalEditors = object.concat(media, other);
      return _.includes(modalEditors, type);
    }
  }
})();
