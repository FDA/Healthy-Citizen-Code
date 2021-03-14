;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('StringFilter', StringFilter);

  /** @ngInject */
  function StringFilter(DxEditorMixin) {
    return function () {
      return DxEditorMixin({
        editorName: 'dxTextBox',

        create: function (init) {
          var options = getOptions(init);
          this.element = $('<div>');

          this.element[this.editorName](options);
        },
      });
    }

    function getOptions(init) {
      var INPUT_TIMEOUT = 300;
      var type = init.args.fieldSchema.type;
      return {
        mode: getTextMode(type),
        onValueChanged: _.debounce(init.onValueChanged, INPUT_TIMEOUT),
        value: init.args.data,
        valueChangeEvent: 'change input',
      };
    }

    function getTextMode(type) {
      var types = {
        'Email': 'email',
        'PasswordAuth': 'password',
        'Url': 'url',
      };

      return types[type] || 'text';
    }}
})();
