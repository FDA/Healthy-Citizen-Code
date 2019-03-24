;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpLookupHelpers', AdpLookupHelpers);

  function AdpLookupHelpers(APP_CONFIG) {
    function getLookupEndpoint(scope) {
      var tableName, endpoint;
      if (!scope.selectedSubject.selected) return;

      tableName = scope.subjects[scope.selectedSubject.selected].table;
      endpoint = APP_CONFIG.apiUrl + '/' +  ['lookups', scope.subjectId, tableName].join('/');

      return endpoint;
    }

    function hasCondition(scope) {
      var result = false;

      _.each(scope.subjects, function (table) {
        result = !!table.where;
      });

      return result;
    }

    function getLabelRenderer(params) {
      var renderName = params.fieldSchema.lookupLabelRender;
      var renderFn = appModelHelpers.LookupLabelRenderers[renderName];

      if (renderFn) {
        return renderFn(params);
      }

      if (renderName) {
        return labelExpression(renderName, params);
      }

      return params.lookup.label;
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

    return {
      endpoint: getLookupEndpoint,
      hasCondition: hasCondition,
      getLabelRenderer: getLabelRenderer
    }
  }
})();
