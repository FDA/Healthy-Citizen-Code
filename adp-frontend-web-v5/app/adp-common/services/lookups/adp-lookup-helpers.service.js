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
      return $('<div class="adp-lookup-item-label">').append(formatLabel(lookupData, args));
    }

    function formatLabel(lookupData, args) {
      var params = getLookupParams(lookupData, args);

      return getLabelRenderer(params);
    }

    function selectionLabel(lookupData, args) {
      var params = getLookupParams(lookupData, args);
      var label = evalLabelExpr(params);
      if (label) {
        return label;
      }

      var isMultipleTable = _.keys(args.modelSchema.lookup.table).length > 1;
      return isMultipleTable ?
        [_.startCase(params.lookup.table), params.lookup.label].join(' | ') :
        params.lookup.label;
    }

    function getLookupParams(lookupData, args) {
      return {
        lookup: lookupData,
        fieldData: lookupData,
        formData: args.row,
        fieldSchema: args.modelSchema,
      };
    }

    function getLabelRenderer(params) {
      var label = evalLabelExpr(params);

      return _.isNil(label) ? params.lookup.label : label;
    }

    function evalLabelExpr(params) {
      var renderName = params.fieldSchema.lookupLabelRender;
      var renderFn = appModelHelpers.LookupLabelRenderers[renderName];

      if (renderFn) {
        return renderFn(params);
      } else if (renderName) {
        return labelExpression(renderName, params);
      } else {
        return null;
      }
    }

    function labelExpression(expression, params) {
      var fn = new Function('lookup, fieldData, formData, fieldSchema', 'return ' + expression);

      try {
        return fn(params.lookup, params.fieldData, params.formData, params.fieldSchema);
      } catch (e) {
        console.log('Error executing lookup label expression', e);
        return params.lookup.label;
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
