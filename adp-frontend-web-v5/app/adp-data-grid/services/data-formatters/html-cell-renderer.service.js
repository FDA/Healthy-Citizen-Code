;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('HtmlCellRenderer', HtmlCellRenderer);

  /** @ngInject */
  function HtmlCellRenderer(
    AdpSchemaService,
    BasicTypesCellRenderer,
    DateTypesCellRenderer,
    LookupTypesCellRenderer,
    MediaTypesCellRenderer,
    LocationCellRenderer,
    ImperialTypesCellRenderer,
    ListTypesCellRenderer,
    ComplexTypesCellRenderer,
    MixedTypeCellRenderer,
    TreeSelectorCellRenderer,
    GRID_FORMAT
  ) {
    var htmlCellRenderers = {
      'Password': BasicTypesCellRenderer.password,
      'String[]': BasicTypesCellRenderer.stringArray,
      'Number': BasicTypesCellRenderer.number,
      'Boolean': BasicTypesCellRenderer.boolean,

      'Date': DateTypesCellRenderer.date,
      'Time': DateTypesCellRenderer.date,
      'DateTime': DateTypesCellRenderer.date,

      'LookupObjectID': LookupTypesCellRenderer.single,
      'LookupObjectID[]': LookupTypesCellRenderer.multiple,

      'File': MediaTypesCellRenderer.fileList,
      'Image': MediaTypesCellRenderer.fileList,
      'Audio': MediaTypesCellRenderer.fileList,
      'Video': MediaTypesCellRenderer.fileList,
      'File[]': MediaTypesCellRenderer.fileList,
      'Image[]': MediaTypesCellRenderer.fileList,
      'Audio[]': MediaTypesCellRenderer.fileList,
      'Video[]': MediaTypesCellRenderer.fileList,

      'Location' : LocationCellRenderer.render,

      // imperial units
      'ImperialHeight': ImperialTypesCellRenderer.render,
      'ImperialWeightWithOz': ImperialTypesCellRenderer.render,
      'ImperialWeight': ImperialTypesCellRenderer.render,

      // lists
      'List': ListTypesCellRenderer.single,
      'List[]': ListTypesCellRenderer.multiple,

      'Object': complexType,
      'Array': complexType,
      'AssociativeArray': complexType,

      'Mixed': MixedTypeCellRenderer.treeView,
      'TreeSelector': TreeSelectorCellRenderer.treeView,
      custom: CustomRender,
    };

    function CellRenderer(args) {
      if (hasCustomRenderer(args.modelSchema)) {
        return htmlCellRenderers.custom;
      }

      var fieldType = AdpSchemaService.getFieldType(args.modelSchema);
      var fallbackCellRenderer = BasicTypesCellRenderer.string;

      return htmlCellRenderers[fieldType] || fallbackCellRenderer;
    }

    function complexType(args) {
      if (_.isNil(args.data) || _.isEmpty(args.data)) {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      return ComplexTypesCellRenderer(args, CellRenderer);
    }

    function CustomRender(args) {
      var renderFn = _.get(appModelHelpers, customRendererPath(args.modelSchema));

      var argsForBackwardCompatibility = [args.data, args.modelSchema.type, args.row];
      return renderFn.apply(args, argsForBackwardCompatibility);
    }

    function hasCustomRenderer(field) {
      var rendererPath = customRendererPath(field);
      return _.hasIn(appModelHelpers, rendererPath);
    }

    function customRendererPath(field) {
      var rendererName = field.render;
      return 'Renderers.' + rendererName;
    }

    return CellRenderer;
  }
})();
