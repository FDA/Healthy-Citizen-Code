;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridModalEditors', GridModalEditors);

  /** @ngInject */
  function GridModalEditors(
    AdpModalService,
    $q
  ) {
    return {
      call: call,
      isModalEditor: isModalEditor,
    }

    function call(options, afterSubmit, onCancel) {
      var field = options.args.modelSchema;

      if (field.type === 'Password') {
        AdpModalService.passwordUpdate(field)
          .then(afterSubmit)
          .catch(onCancel);
      } else {
        var modalOpts = getModalOptions(options.args, afterSubmit);
        return formModal(modalOpts)
          .catch(onCancel);
      }
    }

    function formModal(modalOptions) {
      var modalInstance = AdpModalService.createModal(
        'adpRecordFormModal',
        _.assign({ actionType: 'form', }, modalOptions)
      );

      return modalInstance.result;
    }

    function getModalOptions(args, afterSubmit) {
      return {
        actionCb: function (_s, formData) {
          return $q.when()
            .then(function () {
              var v = formData[args.modelSchema.fieldName];
              return afterSubmit(_.isEmpty(v) ? null : v);
            });
        },
        schema: getSubSchema(args),
        formParams: {
          actionType: args.action,
          btnText: 'Update',
        },
        data: getData(args),
      };
    }

    function getSubSchema(args) {
      var field = args.modelSchema;
      var fields = {};
      fields[field.fieldName] = field;

      return {
        type: "Schema",
        fields: fields,
      }
    }

    function getData(args) {
      var data = {};
      data[args.modelSchema.fieldName] = _.cloneDeep(args.data);

      return data;
    }

    function isModalEditor(type) {
      var object = ['Object', 'Array', 'AssociativeArray'];
      var media = ['File', 'Image', 'Audio', 'Video', 'File[]', 'Image[]', 'Audio[]', 'Video[]'];
      var other = ['Location', 'Code', 'Html', 'Password'];

      var modalEditors = object.concat(media, other);
      return _.includes(modalEditors, type);
    }
  }
})();
