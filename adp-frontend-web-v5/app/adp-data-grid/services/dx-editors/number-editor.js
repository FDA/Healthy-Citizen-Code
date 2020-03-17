;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('NumberEditor', NumberEditor);

  /** @ngInject */
  function NumberEditor(
    DxEditorMixin
  ) {
    return function () {
      return DxEditorMixin({
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
      var type = init.args.modelSchema.type;

      var options = {
        mode: 'number',
        onValueChanged: _.debounce(init.onValueChanged, INPUT_TIMEOUT),
        value: init.args.data,
        valueChangeEvent: 'change keyup input',
        placeholder: init.placeholder,
      };

      // TODO: rework to factory
      var isInt = ['Int32', 'Int64'].includes(type);
      if (isInt) {
        options.onKeyPress = function (e) {
          var domEvent = e.event;
          var isInt = /[+\-]|\d+/.test(domEvent.key);
          if (!isInt) {
            domEvent.preventDefault();
          }
        }
      }

      var isDecimal = type === 'Decimal128';
      if (isDecimal) {
        options.value = castToString(options.value);
        options.onValueChanged = _.debounce(function (e) {
          init.onValueChanged({ value: castToString(e.value) });
        }, INPUT_TIMEOUT);
      }

      return options;
    }

    function castToString(number) {
      return _.isNil(number) ? number : number.toString();
    }
  }
})();
