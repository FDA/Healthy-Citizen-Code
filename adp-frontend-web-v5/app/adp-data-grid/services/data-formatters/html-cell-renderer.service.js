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
    GridTypeCellRenderer,
    GRID_FORMAT
  ) {
    var htmlCellRenderers = {
      'Phone': BasicTypesCellRenderer.phone,
      'Password': BasicTypesCellRenderer.password,
      'String[]': BasicTypesCellRenderer.stringArray,
      'Int32[]': BasicTypesCellRenderer.stringArray,
      'Int64[]': BasicTypesCellRenderer.stringArray,
      'Number[]': BasicTypesCellRenderer.stringArray,
      'Double[]': BasicTypesCellRenderer.stringArray,
      'Decimal128[]': BasicTypesCellRenderer.stringArray,
      'Number': BasicTypesCellRenderer.number,
      'Currency': BasicTypesCellRenderer.currency,
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
      'ImperialHeight': ImperialTypesCellRenderer.multiple,
      'ImperialWeightWithOz': ImperialTypesCellRenderer.multiple,
      'ImperialWeight': ImperialTypesCellRenderer.single,

      // lists
      'List': ListTypesCellRenderer,
      'List[]': ListTypesCellRenderer,

      'Object': complexType,
      'Array': complexType,
      'AssociativeArray': complexType,

      'Mixed': mixedType,
      'TreeSelector': complexType,
      'Html': BasicTypesCellRenderer.escapedHtmlOrRawHtml,
      'String': BasicTypesCellRenderer.stringOrHtml,
      'Grid': GridTypeCellRenderer.render,
      'custom': CustomRender,
    };

    function CellRenderer(args) {
      if (hasCustomRenderer(args.fieldSchema)) {
        return htmlCellRenderers.custom;
      }

      var fieldType = AdpSchemaService.getFieldType(args.fieldSchema);
      var fallbackCellRenderer = BasicTypesCellRenderer.string;

      return htmlCellRenderers[fieldType] || fallbackCellRenderer;
    }

    function complexType(args) {
      if (_.isNil(args.data) || _.isEmpty(args.data)) {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      return ComplexTypesCellRenderer(args, CellRenderer);
    }

    function mixedType(args) {
      if (_.isObject(args.data)) {
        return complexType(args);
      }

      return _.isNil(args.data) ? GRID_FORMAT.EMPTY_VALUE : args.data;
    }

    function CustomRender(args) {
      if (_.isNil(args.data) || _.isEmpty(args.data)) {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      var renderFn = _.get(appModelHelpers, customRendererPath(args.fieldSchema));

      var argsForBackwardCompatibility = [args.data, args.fieldSchema.type, args.row];
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
