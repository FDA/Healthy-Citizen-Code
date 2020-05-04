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
      single: single,
      multiple: multiple,
    };

    function single(args) {
      var value = args.data;
      if (_.isNil(value) || value === 0) {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      var unit = AdpFieldsService.getUnits(args.modelSchema)[0];
      return value + unit.label
    }

    function multiple(args) {
      var value = unwrapValue(args.data);

      if (_.isNil(value)) {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      var units = AdpFieldsService.getUnits(args.modelSchema);

      var valueWithUnits = _.map(units, function(unit, index) {
        return value[index] + unit.label
      });

      return valueWithUnits.join(' ');
    }

    function unwrapValue(value) {
      return _.isString(value) ? value.split('.').map(Number) : value;
    }
  }
})();
