;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('ImperialTypesCellRenderer', ImperialTypesCellRenderer);

  /** @ngInject */
  function ImperialTypesCellRenderer(
    AdpFieldsService,
    GRID_FORMAT
  ) {
    return {
      render: render,
    };

    function render(args) {
      var value = args.data;
      var schema = args.modelSchema;

      if (_.isNil(value) || value === 0) {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      var units = AdpFieldsService.getUnits(schema);
      var valueArray = _.isArray(value) ? value : [value];

      var valueWithUnits = _.map(units, function(unit, index) {
        return valueArray[index] + unit.label
      });

      return valueWithUnits.join(' ');
    }
  }
})();
