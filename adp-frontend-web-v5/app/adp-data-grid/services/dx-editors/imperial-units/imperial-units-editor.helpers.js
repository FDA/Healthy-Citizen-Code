;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('ImperialUnitsEditorsHelpers', ImperialUnitsEditorsHelpers);

  /** @ngInject */
  function ImperialUnitsEditorsHelpers(
    AdpFieldsService
  ) {
    function createFilterComponent(options) {
      var editorName = 'dxSelectBox';
      var editorOptions = {
        value: options.value,
        valueExpr: 'value',
        displayExpr: 'label',
        dataSource: getDataSource(options.unit),
        onValueChanged: options.onValueChanged,
        placeholder: 'Select ' + options.unit.shortName,
        showClearButton: true,
        elementAttr: {
          class: 'adp-select-box adp-imperial-units-multiple',
        },
      };

      return options.element[editorName](editorOptions);
    }

    function getDataSource(unit) {
      var begin = unit.range[0];
      var end = unit.range[1];
      var unitRange = _.range(begin, end);

      return _.map(unitRange, function (i) {
        return { value: i, label: i + unit.label };
      });
    }

    function getUnits(modelSchema) {
      return AdpFieldsService.getUnits(modelSchema);
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
