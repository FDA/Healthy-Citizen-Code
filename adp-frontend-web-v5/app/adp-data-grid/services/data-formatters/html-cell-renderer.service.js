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
    MixedTypeTabbedView,
    GRID_FORMAT,
    AdpAttrs,
    FormattersHelper
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
      'TriStateBoolean': BasicTypesCellRenderer.trisStateBoolean,

      'Date': DateTypesCellRenderer.date,
      'Time': DateTypesCellRenderer.date,
      'DateTime': DateTypesCellRenderer.date,
      'Date[]': DateTypesCellRenderer.dateArray,
      'DateTime[]': DateTypesCellRenderer.dateArray,

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
      var t = getRendererType(args);
      var renderFn = htmlCellRenderers[t];
      var content = renderFn(args);

      var asHtml = !FormattersHelper.asText(args);
      if (asHtml) {
        return wrapContent(content, args, t);
      }

      return content;
    }

    function getRendererType(args) {
      if (hasCustomRenderer(args)) {
        return 'custom';
      }

      var fieldType = AdpSchemaService.getFieldType(args.fieldSchema);
      var fallbackCellRenderer = 'String';

      return !!htmlCellRenderers[fieldType] ? fieldType : fallbackCellRenderer;
    }

    function wrapContent(content, args, renderType) {
      var maxDatagridCellHeight = _.get(args, 'fieldSchema.parameters.maxDatagridCellHeight', 'auto');
      var $container = $('<div class="adp-datagrid-cell-container"></div>');
      $container.css({ maxHeight: args.action === 'view' ? maxDatagridCellHeight : 'auto' });

      (renderType === 'custom') && $container.addClass('adp-datagrid-cell-container-custom-render');

      $container.append(content);

      AdpAttrs($container[0], args);

      return $container;
    }

    function complexType(args) {
      var isEmpty = _.isObject(args.data) ? _.isEmpty(args.data) : _.isNil(args.data);
      if (isEmpty) {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      return ComplexTypesCellRenderer(args, CellRenderer);
    }

    function mixedType(args) {
      if (_.isNil(args.data)) {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      if (typeof args.data !== 'object') {
        return args.data;
      }

      return args.action === 'viewDetails' ?
        MixedTypeTabbedView(args, complexType) :
        complexType(args);
    }

    function CustomRender(args) {
      var renderFn = _.get(appModelHelpers, customRendererPath(args));
      var argsForBackwardCompatibility = [args.data, args.fieldSchema.type, args.row];
      var content = renderFn.apply(args, argsForBackwardCompatibility);

      var isEmpty = _.isObject(args.data) ? _.isEmpty(args.data) : _.isNil(args.data);
      return (isEmpty && !content) ? GRID_FORMAT.EMPTY_VALUE : content;
    }

    function hasCustomRenderer(args) {
      var rendererPath = customRendererPath(args);
      return _.hasIn(appModelHelpers, rendererPath);
    }

    function customRendererPath(args) {
      var rendererType = args.action === 'export' ? 'exportRender' : 'render';
      var rendererName = _.get(args, 'fieldSchema.' + rendererType);

      return 'Renderers.' + rendererName;
    }

    return CellRenderer;
  }
})();
