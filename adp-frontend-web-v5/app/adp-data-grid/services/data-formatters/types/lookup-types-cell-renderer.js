;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('LookupTypesCellRenderer', LookupTypesCellRenderer);

  /** @ngInject */
  function LookupTypesCellRenderer(
    GRID_FORMAT,
    FormattersHelper,
    AdpLookupHelpers
  ) {
    function single(args) {
      var id = _.get(args, 'data._id', null);
      if (_.isEmpty(args.data) && _.isNull(id)) {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      return lookupLabel(args.data, args);
    }

    function multiple(args) {
      if (_.isPlainObject(args.data)) {
        return  single(args);
      }
      if (!_.isArray(args.data) || _.isEmpty(args.data)) {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      var separator = FormattersHelper.asText(args) ? (FormattersHelper.commaDotSeparator(args) || '; ') : '</br>';

      return args.data.map(function (v) {
        return lookupLabel(v, args);
      }).join(separator);
    }

    function lookupLabel(value, args) {
      var separator = ' | ';
      var formattedValue = AdpLookupHelpers.formatLabel(value, args);

      if (AdpLookupHelpers.tablesList(args.fieldSchema).length > 1) {
        return [
          value.table,
          formattedValue + '\n',
        ].join(separator);
      } else {
        return formattedValue;
      }
    }

    return {
      multiple: multiple,
      single: single,
    }
  }
})();
