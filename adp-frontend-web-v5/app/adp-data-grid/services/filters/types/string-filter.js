;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('StringFilter', StringFilter);

  /** @ngInject */
  function StringFilter(DxFilterMixin) {
    function getOptions(init) {
      var INPUT_TIMEOUT = 300;
      return {
        mode: 'text',
        onValueChanged: _.debounce(init.onValueChanged, INPUT_TIMEOUT),
        tabIndex: 0,
        value: init.args.data,
        valueChangeEvent: 'change keyup input',
      };
    }

    return function () {
      return DxFilterMixin({
        editorName: 'dxTextBox',

        create: function (init) {
          var options = getOptions(init);
          this.element = $('<div>');

          this.element[this.editorName](options);
        },
      });
    }
  }
})();
