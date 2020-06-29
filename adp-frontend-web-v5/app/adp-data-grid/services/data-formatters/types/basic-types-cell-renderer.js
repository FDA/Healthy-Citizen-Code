;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('BasicTypesCellRenderer', BasicTypesCellRenderer);

  /** @ngInject */
  function BasicTypesCellRenderer(
    FormattersHelper,
    GRID_FORMAT,
    DX_ACCOUNTING_FORMAT
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

    function phone(args) {
      var value = args.data;

      return (_.isNil(value) || value === '') ?
        GRID_FORMAT.EMPTY_VALUE :
        [value.slice(0, 3), value.slice(3,6), value.slice(6, 10)].join('-');
    }

    function currency(args) {
      if (_.isNil(args.data)) {
        return GRID_FORMAT.EMPTY_VALUE;
      }
      var format = _.get(args, 'modelSchema.parameters.format', DX_ACCOUNTING_FORMAT)
      var formattedValue = DevExpress.localization.formatNumber(args.data, format);

      if (FormattersHelper.asText(args) || args.data >= 0) {
        return formattedValue;
      } else {
        return '<span class=text-danger>' + formattedValue + '</span>';
      }
    }

    function stringOrHtml(args) {
      var rawValue = args.data;
      if (_.isNil(rawValue) || rawValue === '') {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      if (FormattersHelper.asText(args)) {
        return rawValue;
      } else {
        var renderAsHtml = _.get(args, 'modelSchema.parameters.renderAsHtml', false);
        return renderAsHtml ? rawValue : _.escape(rawValue);
      }
    }

    function escapedHtmlOrRawHtml(args) {
      var rawValue = args.data;
      if (_.isNil(rawValue) || rawValue === '') {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      if (FormattersHelper.asText(args)) {
        return rawValue;
      } else {
        var renderAsHtml = _.get(args, 'modelSchema.parameters.renderAsHtml', false);
        return renderAsHtml ? htmlCellContent(args) : stripHtml(rawValue);
      }
    }

    function htmlCellContent(args) {
      var maxHeight = _.get(args, 'modelSchema.parameters.maxDatagridCellHeight');
      var tpl = '<div style="height: auto; max-height: ' + maxHeight + 'px; overflow-y: scroll;"></div>';

      var container = $(tpl);
      container.append(args.data);

      return container;
    }

    function stripHtml(html) {
      var tmp = document.createElement('DIV');
      tmp.innerHTML = html;
      var stripped = (tmp.textContent || tmp.innerText).trim() || "";

      if (!stripped) {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      return getSubstr(stripped);
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
      phone: phone,
      currency: currency,
      stringOrHtml: stringOrHtml,
      escapedHtmlOrRawHtml: escapedHtmlOrRawHtml,
    }
  }
})();
