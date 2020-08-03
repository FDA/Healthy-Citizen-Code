;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('NumberMultipleEditor', NumberMultipleEditor);

  /** @ngInject */
  function NumberMultipleEditor(
    NumberArrayEditorConfig,
    DxEditorMixin,
    AdpFieldsService
  ) {
    return function () {
      return DxEditorMixin({
        editorName: 'dxTagBox',

        create: function (init) {
          this.init = init;
          this.element = $('<div>');
          this.element[this.editorName](this.getOptions());
        },

        getOptions: function () {
          var fieldData = this.init.args.data;
          var fieldSchema = this.init.args.fieldSchema;

          var self = this;
          var defaults = NumberArrayEditorConfig(fieldData, function (e) {
            self.init.onValueChanged({ value: (e.value || []).map(_.toNumber) })
          });

          var editorConfig = _.merge(defaults, {
            fieldTemplate: _.partial(fieldTemplate, fieldSchema),
            elementAttr: { class: 'adp-select-box adp-number-array' },
          });

          return AdpFieldsService.configFromParameters(fieldSchema, editorConfig);
        }
      });
    }

    function fieldTemplate(fieldSchema, data, container) {
      var numberBox = $('<div class="adp-text-box">')
        .dxNumberBox(getNumberBoxConfig());

      function getNumberBoxConfig() {
        var isInt = _.includes(['Int32[]', 'Int64[]'], fieldSchema);

        return {
          value: null,
          placeholder: 'Type in new value and press Enter',
          mode: 'number',
          valueChangeEvent: 'blur keyup change',
          format: isInt ? '#' : '',
        };
      }

      container.append(numberBox);
    }

  }
})();
