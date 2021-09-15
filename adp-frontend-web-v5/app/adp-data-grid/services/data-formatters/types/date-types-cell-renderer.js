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
      var type = _.get(args, 'fieldSchema.type');
      var dateFormat = getDateFormat(type);
      var value = args.data;

      return _.isNil(value) ? GRID_FORMAT.EMPTY_VALUE : dayjs(value).format(dateFormat);
    }

    function getDateFormat(type) {
      var dateFormats = {
        Date: DATE_FORMAT,
        Time: TIME_FORMAT,
        DateTime: DATE_TIME_FORMAT
      };

      return dateFormats[type];
    }

    function dateArray(args) {
      if (_.isNil(args.data) || _.isEmpty(args.data)) {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      var type = _.get(args, 'fieldSchema.type').replace('[]', '');
      var format = getDateFormat(type);

      return args.data.map(function (v) {
        return dayjs(v).format(format);
      }).join(', ');
    }

    return {
      date: date,
      dateArray: dateArray,
    }
  }
})();
