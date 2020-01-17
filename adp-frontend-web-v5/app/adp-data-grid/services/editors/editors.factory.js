;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridEditorsFactory', GridEditorsFactory);

  /** @ngInject */
  function GridEditorsFactory(AdpModalService) {
    var editorsByType = {
      String: stringEditor,
      Phone: stringEditor,
      Url: stringEditor,
      Email: stringEditor,
      Number: function (options) {
        return $('<div>').dxNumberBox({
          mode: 'number',
          value: options.value,
          onValueChanged: options.onValueChanged,
        });
      },
      Text: function (options) {
        return $('<div>').dxTextArea({
          value: options.value,
          onValueChanged: options.onValueChanged,
        });
      },
      Boolean: function (options) {
        return $('<div>').dxSelectBox({
          value: options.value,
          displayExpr: 'label',
          valueExpr: 'value',
          placeholder: '(Select)',
          items: [
            { label: 'Yes', value: true },
            { label: 'No', value: null },
          ],
          onValueChanged: options.onValueChanged,
        });
      },
      'String[]': function (options) {
        return $('<div>').dxTagBox({
          value: options.value,
          acceptCustomValue: true,
          onValueChanged: options.onValueChanged,
        });
      },
      Password: function (options) {
        return $('<a href>Update Password</a>').on('click', function (e) {
          e.preventDefault();

          AdpModalService.passwordUpdate(options.args.modelSchema)
            .then(function (resultValue) {
              options.onValueChanged({ value: resultValue });
            });
        });
      }
    };

    function stringEditor(options) {
      return $('<div>').dxTextBox({
        mode: 'text',
        value: options.value,
        onValueChanged: options.onValueChanged,
      });
    }

    return function (field) {
      if (!field) {
        return;
      }

      if (field.list) {
        return;
      }

      return editorsByType[field.type];
    }
  }
})();
