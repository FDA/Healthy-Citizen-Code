;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridEditorsFactory', GridEditorsFactory);

  /** @ngInject */
  function GridEditorsFactory(
    NumberEditor,
    DateEditor,
    ListEditorFactory,
    StringEditor,
    BooleanEditor,
    ImperialUnitSingleEditor,
    ImperialUnitMultipleEditor,
    LookupEditor,
    TextEditor,
    StringMultipleEditor,
    IntEditor,
    DecimalEditor,
    CurrencyEditor,
    NumberMultipleEditor,
    DecimalMultipleEditor
  ) {
    var editorsByType = {
      String: StringEditor,
      Phone: StringEditor,
      Url: StringEditor,
      Email: StringEditor,
      Number: NumberEditor,
      Double: NumberEditor,
      Text: TextEditor,
      Boolean: BooleanEditor,
      TriStateBoolean: BooleanEditor,

      List: ListEditorFactory.single,
      'List[]': ListEditorFactory.multiple,

      ImperialHeight: ImperialUnitMultipleEditor,
      ImperialWeightWithOz: ImperialUnitMultipleEditor,
      ImperialWeight: ImperialUnitSingleEditor,

      Date: DateEditor,
      Time: DateEditor,
      DateTime: DateEditor,

      LookupObjectID: LookupEditor.single,
      'LookupObjectID[]': LookupEditor.multiple,
      Int32: IntEditor,
      Int64: IntEditor,
      Decimal128: DecimalEditor,
      Currency: CurrencyEditor,

      'String[]': StringMultipleEditor,
      'Decimal128[]': DecimalMultipleEditor,
      'Number[]': NumberMultipleEditor,
      'Double[]': NumberMultipleEditor,
      'Int32[]': NumberMultipleEditor,
      'Int64[]': NumberMultipleEditor,
    };

    return function (options) {
      var field = _.get(options, 'args.fieldSchema')
      var type = _.get(options, 'args.fieldSchema.type');

      var newEditorComponent;
      if (field.list) {
        var isMultiple = type.includes('[]');
        newEditorComponent = isMultiple ? editorsByType['List[]']() : editorsByType['List']();
      } else {
        newEditorComponent = editorsByType[type]();
      }

      newEditorComponent.create(options);
      return newEditorComponent.getElement();
    }
  }
})();
