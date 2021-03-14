;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('StringMultipleEditor', StringMultipleEditor);

  /** @ngInject */
  function StringMultipleEditor(
    StringArrayEditorConfig,
    DxEditorMixin,
    AdpFieldsService
  ) {
    function getOptions(init) {
      var fieldData = init.args.data;
      var defaults = StringArrayEditorConfig(init.args, fieldData, init.onValueChanged);
      return AdpFieldsService.configFromParameters(init.args.fieldSchema, defaults);
    }

    return function () {
      return DxEditorMixin({
        editorName: 'dxTagBox',

        create: function (init) {
          var options = getOptions(init);
          this.element = $('<div>');
          this.element[this.editorName](options);
        },
      });
    }
  }
})();
