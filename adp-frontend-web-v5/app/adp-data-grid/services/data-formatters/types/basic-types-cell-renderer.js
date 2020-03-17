;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('BasicTypesCellRenderer', BasicTypesCellRenderer);

  /** @ngInject */
  function BasicTypesCellRenderer(
    FormattersHelper,
    GRID_FORMAT
  ) {
    function password() {
      return '********';
    }

    function stringArray(args) {
      var value = args.data;

      if (!_.isArray(value) || _.isEmpty(value)) {
        return GRID_FORMAT.EMPTY_VALUE;
      }
      return value.map(_.escape).join(', ');
    }

    function number(args) {
      var value = args.data;
      var number = parseFloat(value);

      return _.isNaN(number) ? GRID_FORMAT.EMPTY_VALUE : number;
    }

    function boolean(args) {
      var value = !!args.data;

      if  (FormattersHelper.asText(args)) {
        return value ? 'true' : 'false'
      } else {
        var iconName = value ? 'check' : 'times';

        return '<i class="fa fa-' + iconName + '"></i>';
      }
    }

    function string(args) {
      var value = args.data;
      return (_.isNil(value) || value === '') ? GRID_FORMAT.EMPTY_VALUE : _.escape(value);
    }

    return {
      password: password,
      number: number,
      stringArray: stringArray,
      boolean: boolean,
      string: string,
    }
  }
})();
