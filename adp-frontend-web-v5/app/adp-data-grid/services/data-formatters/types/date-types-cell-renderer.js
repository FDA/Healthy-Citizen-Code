;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('DateTypesCellRenderer', DateTypesCellRenderer);

  /** @ngInject */
  function DateTypesCellRenderer(
    GRID_FORMAT,
    DATE_FORMAT,
    DATE_TIME_FORMAT,
    TIME_FORMAT
  ) {
    function date(args) {
      var dateFormat = getDateFormat(args);
      var value = args.data;
      return _.isNil(value) ? GRID_FORMAT.EMPTY_VALUE : moment(value).format(dateFormat);
    }

    function getDateFormat(args) {
      var dateFormats = {
        Date: DATE_FORMAT,
        Time: TIME_FORMAT,
        DateTime: DATE_TIME_FORMAT
      };

      var type = _.get(args, 'fieldSchema.type');

      return dateFormats[type];
    }

    return {
      date: date,
    }
  }
})();
