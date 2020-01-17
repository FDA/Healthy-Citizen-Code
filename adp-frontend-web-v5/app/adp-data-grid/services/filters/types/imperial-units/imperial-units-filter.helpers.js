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
        elementAttr: { 'class': 'data-grid-tagbox-filter' },
        dataSource: getDataSource(options.unit),
        onValueChanged: options.onValueChanged,
        placeholder: 'Select ' + options.unit.shortName,
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
