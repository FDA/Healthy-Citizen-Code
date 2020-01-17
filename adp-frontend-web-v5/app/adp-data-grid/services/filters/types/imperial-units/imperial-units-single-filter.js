;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('imperialUnitSingleFilter', imperialUnitSingleFilter);

  /** @ngInject */
  function imperialUnitSingleFilter(
    ImperialUnitsFilterHelpers,
    DxFilterMixin
  ) {
    return function () {
      return DxFilterMixin({
        editorName: 'dxSelectBox',
        element: $('<div>'),

        create: function (init) {
          this.createEditor(init);
          this.addRangeText(init.placeholder);
        },

        createEditor: function(init) {
          var units = ImperialUnitsFilterHelpers.getUnits(init.args.modelSchema);

          ImperialUnitsFilterHelpers.createFilterComponent({
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

          var el = ImperialUnitsFilterHelpers.createRangePlaceholderElement(placeholder);
          this.element.prepend(el);
        }
      });
    };
  }
})();
