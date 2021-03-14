;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .factory('AdpLookupHelpers', AdpLookupHelpers);

  function AdpLookupHelpers() {
    function lookupItemTemplate(data, args) {
      var container = $('<div class="adp-lookup-drop-down-item">');
      container.append(createLabel(data, args));

      return container;
    }

    function createLabel(lookupData, args) {
      var labelHtml = [
        '<div ',
        'class="adp-lookup-item-label"',
        'adp-qaid-control-dropdown-item="' + args.path + '"',
        '>'
      ].join(' ');

      return $(labelHtml).append(formatLabel(lookupData, args));
    }

    function formatLabel(lookupData, args) {
      var labelFromExpr = evalLabelExpr(lookupData, args);
      return labelFromExpr || lookupData.label;
    }

    function selectionLabel(lookupData, args) {
      var label = evalLabelExpr(lookupData, args);
      if (!_.isNull(label)) {
        return label;
      }

      var isMultipleTable = _.keys(args.fieldSchema.lookup.table).length > 1;
      return isMultipleTable ?
        [_.startCase(lookupData.table), lookupData.label].join(' | ') :
        lookupData.label;
    }

    function evalLabelExpr(lookupData, unifiedArgs) {
      var args = _.assign({}, unifiedArgs, { lookup: lookupData });
      var labelRenderer = getLabelRenderFn(args);
      if (_.isNull(labelRenderer)) {
        return null;
      }

      var compatibilityArgs = [args.lookup, args.data, args.row, args.fieldSchema];
      try {
        return labelRenderer.apply(args, compatibilityArgs);
      } catch (e) {
        console.log('Error executing lookup label expression', e);
      }
    }

    function getLabelRenderFn(args) {
      var renderNameOrExpression = _.get(args, 'fieldSchema.lookupLabelRender', null);
      var renderFn = _.get(window, 'appModelHelpers.LookupLabelRenderers.' + renderNameOrExpression, null);

      if (_.isFunction(renderFn)) {
        return renderFn;
      } else if (renderNameOrExpression) {
        return new Function('lookup, fieldData, formData, fieldSchema', 'return ' + renderNameOrExpression);
      } else {
        return null;
      }
    }

    function tablesList(schema) {
      return schema.lookup && schema.lookup.table ? _.keys(schema.lookup.table) : [];
    }

    return {
      selectionLabel: selectionLabel,
      formatLabel: formatLabel,
      lookupItemTemplate: lookupItemTemplate,
      tablesList: tablesList,
    }
  }
})();
