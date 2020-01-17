;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('BooleanFilter', BooleanFilter);

  /** @ngInject */
  function BooleanFilter(
    DxFilterMixin,
    BOOLEAN_FILTER_VALUES
  ) {
    function getOptions(init) {
      return {
        value: init.args.data,
        displayExpr: 'label',
        valueExpr: 'value',
        placeholder: '(All)',
        items: [
          { label: 'Yes', value: BOOLEAN_FILTER_VALUES.TRUE },
          { label: 'No', value: BOOLEAN_FILTER_VALUES.FALSE },
        ],
        onValueChanged: init.onValueChanged,
        valueChangeEvent: 'change blur',
      };
    }

    return function () {
      return DxFilterMixin({
        editorName: 'dxSelectBox',

        create: function (init) {
          var options = getOptions(init);
          this.element = $('<div>');

          this.element[this.editorName](options);
        },
      });
    }
  }
})();
