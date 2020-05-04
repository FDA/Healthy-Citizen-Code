;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('NumberFilter', NumberFilter);

  /** @ngInject */
  function NumberFilter(
    DxEditorMixin
  ) {
    return function () {
      return DxEditorMixin({
        editorName: 'dxNumberBox',

        create: function (init) {
          this.element = $('<div>');
          this.element[this.editorName](this.getOptions(init));
        },

        getOptions: function (init) {
          var self = this;

          return {
            onKeyDown: function (e) {
              // WORKAROUND: to allow removing zero from input
              if (changedToNull(e.event)) {
                self.reset();
              }
            },
            onValueChanged: _.debounce(init.onValueChanged, 300),
            value: init.args.data,
            valueChangeEvent: 'blur input',
            placeholder: init.placeholder,
            format: {
              type: 'decimal'
            },
          }
        },
      });
    };

    function changedToNull(e) {
      if (e.key !== 'Backspace') {
        return false;
      }

      var input = e.target;
      var hasSingleChar = input.value.length === 1 && input.selectionStart === 1;
      var hasSingleNegativeChar = /\-\d/.test(input.value) && input.selectionStart === 2;
      var allTextSelected = input.value.length === (input.selectionEnd - input.selectionStart);

      return hasSingleChar || hasSingleNegativeChar || allTextSelected;
    }
  }
})();
