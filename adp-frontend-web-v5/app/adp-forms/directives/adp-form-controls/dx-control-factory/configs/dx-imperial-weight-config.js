;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('DxImperialWeightConfig', DxImperialWeightConfig);

  /** @ngInject */
  function DxImperialWeightConfig(AdpFieldsService) {
    return function (args) {
      var unit = AdpFieldsService.getUnitsList(args.fieldSchema)[0];

      return {
        options: {
          valueExpr: 'value',
          displayExpr: 'label',
          items: unit.list,
          placeholder: 'Select ' + unit.shortName,
          showClearButton: true,
          elementAttr: {
            class: 'adp-select-box',
            id: 'list_id_' + args.fieldSchema.fieldName,
          },
          inputAttr: {
            'adp-qaid-field-control': args.path,
          },
          itemTemplate: function (data, index, element) {
            element.attr('adp-qaid-control-dropdown-item', args.path);
            return data.label;
          },
        },
        widgetName: 'dxSelectBox',
      };
    }
  }

})();
