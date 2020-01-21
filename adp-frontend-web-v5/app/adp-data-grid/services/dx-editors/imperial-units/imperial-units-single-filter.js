;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('ImperialUnitSingleEditor', ImperialUnitSingleEditor);

  /** @ngInject */
  function ImperialUnitSingleEditor(
    ImperialUnitsEditorsHelpers,
    DxEditorMixin
  ) {
    return function () {
      return DxEditorMixin({
        editorName: 'dxSelectBox',
        element: $('<div>'),

        create: function (init) {
          this.createEditor(init);
          this.addRangeText(init.placeholder);
        },

        createEditor: function(init) {
          var units = ImperialUnitsEditorsHelpers.getUnits(init.args.modelSchema);

          ImperialUnitsEditorsHelpers.createFilterComponent({
            unit: units[0],
            element: this.element,
            onValueChanged: init.onValueChanged,
            value: init.args.data,
          });
        },

        addRangeText: function (placeholder) {
          if (!placeholder) {
            return;
          }

          var el = ImperialUnitsEditorsHelpers.createRangePlaceholderElement(placeholder);
          this.element.prepend(el);
        }
      });
    };
  }
})();
