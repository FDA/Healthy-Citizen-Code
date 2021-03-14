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
        return wrapContent(content, args);
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

    function wrapContent(content, args) {
      var div = $('<div>').append(content);
      AdpAttrs(div[0], args);

      return div;
    }

    function complexType(args) {
      var isEmpty = _.isObject(args.data) ? _.isEmpty(args.data) : _.isNil(args.data);
      if (isEmpty) {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      return ComplexTypesCellRenderer(args, CellRenderer);
    }

    function mixedType(args) {
      function mixedTypeViewDetails(args) {
        var YAML = complexType(args);
        var content = function (contentStr) {
          var maxHeight = 200 + 'px';

          return '<div style="max-height: ' + maxHeight + '" class="adp-tab-content"><div>' + contentStr + '</div></div>';
        };

        var tabsEl = $('<div>');
        setTimeout(function () {
          var tabsInstance = tabsEl.dxTabPanel({
            selectedIndex: 0,
            items: [{
              title: 'YAML',
              html: content(!!YAML.html ? YAML.html() : YAML),
            }, {
              title: 'JSON',
              html: content(JSON.stringify(args.data, null, 4)),
            }],
            scrollingEnabled: true,
          }).dxTabPanel("instance");

          tabsEl.on('remove', function () {
            tabsInstance.dispose();
          })
        }, 0);

        return tabsEl;
      }

      if (_.isNil(args.data)) {
        return GRID_FORMAT.EMPTY_VALUE;
      }

      return args.action === 'viewDetails' ? mixedTypeViewDetails(args) : complexType(args);
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
