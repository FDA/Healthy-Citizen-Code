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
      return FormattersHelper.asText(args) ?
        booleanText(args.data) :
        booleanHtml(args.data);
    }

    function booleanText(value) {
      if (value === true || value === 'TRUE_VALUE') {
        return 'true';
      } else {
        return 'false';
      }
    }

    function booleanHtml(value) {
      var iconName;
      if (value === true) {
        iconName = 'check-square-o';
      } else {
        iconName = 'square-o';
      }

      return '<i class="fa fa-' + iconName + '"></i>';
    }

    function string(args) {
      var value = args.data;
      return (_.isNil(value) || value === '') ? GRID_FORMAT.EMPTY_VALUE : _.escape(value);
    }

    function htmlType(args) {
      if (FormattersHelper.asText(args)) {
        return string(args);
      } else {
        var value = stripHtml(args.data);
        return value ?
          getSubstr(value) :
          GRID_FORMAT.EMPTY_VALUE;
      }
    }

    function stripHtml(html) {
      var tmp = document.createElement("DIV");
      tmp.innerHTML = html;
      return (tmp.textContent || tmp.innerText).trim() || "";
    }

    function getSubstr(str) {
      var maxStrLen = 100;
      return str.length > maxStrLen ? str.substring(0, maxStrLen) + '...' : str;

    }

    return {
      password: password,
      number: number,
      stringArray: stringArray,
      boolean: boolean,
      string: string,
      htmlType: htmlType,
    }
  }
})();
