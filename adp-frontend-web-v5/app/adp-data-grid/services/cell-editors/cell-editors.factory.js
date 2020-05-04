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
    DecimalEditor
  ) {
    var editorsByType = {
      String: StringEditor,
      Phone: StringEditor,
      Url: StringEditor,
      Email: StringEditor,
      Number: NumberEditor,
      Double: NumberEditor,
      Text: TextEditor,
      'String[]': StringMultipleEditor,
      Boolean: BooleanEditor,

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
    };

    return function (options) {
      var field = _.get(options, 'args.modelSchema')
      var type = _.get(options, 'args.modelSchema.type');

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
