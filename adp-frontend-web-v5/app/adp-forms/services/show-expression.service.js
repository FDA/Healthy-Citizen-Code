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
     * @param {Object} params
     * @param {Object} params.formData
     * @param {Object} params.schema - original schema from appModel
     * @param {Object} params.groups - Groups with fields inside
     * @param {Object} params.visibilityMap - <string, boolean> map with visibility state of form, where key is schema path
     * @param {String} params.actionType
     */
    function evaluateShow(params) {
      _evaluateShowForFields(params);
      _updateVisibilityForFieldsInGroups(params);
    }

    function _evaluateShowForFields(params) {
      var formData = params.formData;
      var schema = params.schema;

      AdpFormIteratorUtils.traverseFormDataPostOrder(
        formData, schema, '',
        function (formDataRef, currentField, currentPath) {
          if (_.isUndefined(currentField.show)) {
            return;
          }

          _updateVisibilityMap(params, currentPath);
          _setEmptyValueIfFieldHidden(formDataRef, params.visibilityMap);
        });
    }

    function _updateVisibilityMap(params, currentPath) {
      var visibilityMap = params.visibilityMap;
      var displayConditionFn = _createShowFnByPath(params, currentPath);

      try {
        visibilityMap[currentPath] = displayConditionFn();
      } catch (e) {
        console.error('Error while evaluating show attribute for: ', e, currentPath);
      }
    }

    function _setEmptyValueIfFieldHidden(formData, visibilityMap, currentField, currentPath) {
      var formRendered = _.isEmpty(formData);
      var fieldIsVisible = visibilityMap[currentPath];
      if (!formRendered || fieldIsVisible) {
        return;
      }

      var emptyValue = currentField.type === 'Array' ? {} : null;
      _.set(formData, currentPath, emptyValue);
    }

    function _createShowFnByPath(params, path) {
      var args = AdpUnifiedArgs.getHelperParams({
        path: path,
        formData: params.formData,
        action:  params.actionType,
        schema: params.schema,
      });


      var data = _.get(args.row, args.path, args.row);
      var showExpression = args.modelSchema.show;

      // DEPRECATION NOTICE
      // args provided to ShowExpression as context params available as this.argName
      // other arguments provided for compatibility reasons, DO NOT USE THEM: will obsolete soon
      return new Function('data, row, modelSchema, $action', 'return ' + showExpression)
        .bind(args, data, args.row, args.modelSchema, args.action);
    }

    function _updateVisibilityForFieldsInGroups(params) {
      var groups = params.groups;
      var formData = params.formData;
      var visibilityMap = params.visibilityMap;

      _.each(groups, function (group) {
        if (_.isEmpty(formData) || _.isUndefined(group.show)) {
          return;
        }

        _.each(group.fields, function (field) {
          if (field.show) {
            return;
          }

          var isGroupVisible = visibilityMap[group.fieldName];
          var path = field.fieldName;

          var updateFn = field.type === 'Array' ?
            _updateVisibilityForArrayInGroup :
            _updateVisibilityForPrimitiveInGroup;

          updateFn(isGroupVisible, visibilityMap, formData, path);
        });
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
