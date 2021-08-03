;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('ShowExpression', ShowExpression);

  function ShowExpression(
    AdpUnifiedArgs,
    AdpFormIteratorUtils
  ) {
    return {
      eval: evaluateShow
    }

    /**
     * TODO: refactor to unified args
     * TODO: explain how it works
     * @param {Object} params
     * @param {Object} params.args
     * @param {Object} params.groups - Groups with fields inside
     * @param {Object} params.visibilityMap - <string, boolean> map with visibility state of form, where key is schema path
     */
    function evaluateShow(params) {
      AdpFormIteratorUtils.traverseFormDataPostOrder(
        params.args,
        function (currArgs) {
          if (!_.isString(currArgs.fieldSchema.showInForm)) {
            return;
          }

          _updateVisibilityMap(currArgs, params.visibilityMap);
        });
    }

    function _updateVisibilityMap(args, visibilityMap) {
      var displayConditionFn = _createShowFnByPath(args);

      try {
        visibilityMap[args.path] = displayConditionFn();
      } catch (e) {
        console.error('Error while evaluating show attribute for: ', e, args.path);
      }
    }

    function _createShowFnByPath(args) {
      // DEPRECATION NOTICE
      // args provided to ShowExpression as context params available as this.argName
      // other arguments provided for compatibility reasons, DO NOT USE THEM: will obsolete soon
      return new Function('data, row, fieldSchema, $action', 'return ' + args.fieldSchema.showInForm)
        .bind(args, args.data, args.row, args.fieldSchema, args.action);
    }
  }
})();
