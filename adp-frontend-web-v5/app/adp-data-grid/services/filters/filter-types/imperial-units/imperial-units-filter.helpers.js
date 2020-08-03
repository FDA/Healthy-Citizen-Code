;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('ImperialUnitsFilterHelpers', ImperialUnitsFilterHelpers);

  /** @ngInject */
  function ImperialUnitsFilterHelpers(
    AdpFieldsService
  ) {
    function createFilterComponent(options) {
      var editorName = 'dxSelectBox';
      var editorOptions = {
        value: options.value,
        valueExpr: 'value',
        displayExpr: 'label',
        dataSource: options.unit.list,
        onValueChanged: options.onValueChanged,
        placeholder: 'Select ' + options.unit.shortName,
        showClearButton: true,
        elementAttr: {
          class: 'adp-select-box adp-imperial-units-multiple',
        },
      };

      return options.element[editorName](editorOptions);
    }

    function getUnits(fieldSchema) {
      return AdpFieldsService.getUnitsList(fieldSchema);
    }

    function createRangePlaceholderElement(placeholder) {
      return $('<div class="imperial-unit-range-text">' + placeholder + '</div>');
    }

    return {
      getUnits: getUnits,
      createFilterComponent: createFilterComponent,
      createRangePlaceholderElement: createRangePlaceholderElement,
    }
  }
})();
