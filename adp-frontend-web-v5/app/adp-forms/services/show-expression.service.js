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
      _evaluateShowForFields(params.args, params.visibilityMap);
      _updateVisibilityForFieldsInGroups(params.args, params.visibilityMap, params.groups);
    }

    function _evaluateShowForFields(rootArgs, visibilityMap) {
      AdpFormIteratorUtils.traverseFormDataPostOrder(
        rootArgs,
        function (currArgs) {
          if (_.isUndefined(currArgs.fieldSchema.show)) {
            return;
          }

          _updateVisibilityMap(currArgs, visibilityMap);
          _setEmptyValueIfFieldHidden(currArgs, visibilityMap);
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
      return new Function('data, row, fieldSchema, $action', 'return ' + args.fieldSchema.show)
        .bind(args, args.data, args.row, args.fieldSchema, args.action);
    }

    function _setEmptyValueIfFieldHidden(args, visibilityMap) {
      var formRendered = _.isEmpty(args.row);
      var fieldIsVisible = visibilityMap[args.path];
      if (!formRendered || fieldIsVisible) {
        return;
      }

      var emptyValue = args.fieldSchema.type === 'Array' ? {} : null;
      _.set(args.row, args.path, emptyValue);
    }

    function _updateVisibilityForFieldsInGroups(rootArgs, visibilityMap, groups) {
      if (_.isEmpty(rootArgs.row)) {
        return;
      }

      _forEachGroup(groups, function (group) {
        _.each(group.fields, function (field) {
          if (field.show) {
            return;
          }

          var path = field.fieldName;
          var updateFn = field.type === 'Array' ?
            _updateVisibilityForArrayInGroup :
            _updateVisibilityForPrimitiveInGroup;

          updateFn(visibilityMap[group.fieldName], visibilityMap, rootArgs.row, path);
        });
      });
    }

    function _forEachGroup(groups, cb) {
      _.each(groups, function (group) {
        if (_.isUndefined(group.show)) {
          return;
        }

        cb(group);
      });
    }

    function _updateVisibilityForArrayInGroup(isGroupVisible, visibilityMap, formData, path) {
      var arrayData = formData[path];

      _.forEach(arrayData, function (item, index) {
        var arrayPath = path + '[' + index + ']';
        if (!isGroupVisible) {
          _.set(formData, arrayPath, {});
        }

        visibilityMap[arrayPath] = isGroupVisible;
      });
    }

    function _updateVisibilityForPrimitiveInGroup(isGroupVisible, visibilityMap, formData, path) {
      if (!isGroupVisible) {
        _.set(formData, path, null);
      }

      visibilityMap[path] = isGroupVisible;
    }
  }
})();
