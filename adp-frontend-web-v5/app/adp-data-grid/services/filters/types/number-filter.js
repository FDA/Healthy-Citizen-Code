;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('NumberFilter', NumberFilter);

  /** @ngInject */
  function NumberFilter(
    DxFilterMixin
  ) {
    return function () {
      return DxFilterMixin({
        editorName: 'dxNumberBox',

        create: function (init) {
          var options = getOptions(init);
          this.element = $('<div>');

          this.element[this.editorName](options);
        },
      });
    };

    function getOptions(init) {
      var INPUT_TIMEOUT = 300;

      return {
        mode: 'number',
        onValueChanged: _.debounce(init.onValueChanged, INPUT_TIMEOUT),
        tabIndex: 0,
        value: init.args.data,
        valueChangeEvent: 'change keyup input',
        placeholder: init.placeholder,
      };
    }
  }
})();
