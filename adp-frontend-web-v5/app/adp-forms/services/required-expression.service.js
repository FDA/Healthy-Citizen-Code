;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('RequiredExpression', RequiredExpression);

  function RequiredExpression(
    AdpValidationUtils,
    AdpFormIteratorUtils,
    AdpFormDataUtils,
    AdpUnifiedArgs,
    AdpPath
  ) {
    return {
      eval: evaluateRequiredStatus,
    }

    // TODO: refactor to unified args
    function evaluateRequiredStatus(options) {
      var args = options.args;
      var form = options.form;
      var requiredMap = options.requiredMap;

      var argsWithCleanedRow = AdpFormDataUtils.cleanFormDataAndKeepArraysPositions(args);

      AdpFormIteratorUtils.traverseFormDataPostOrder(
        args,
        function (currArgs) {
          if (currArgs.fieldSchema.type === 'Schema') {
            return;
          }

          var currentArgsForRequired = AdpUnifiedArgs.getHelperParamsWithConfig({
            formData: argsWithCleanedRow.row,
            schema: currArgs.modelSchema,
            path: currArgs.path,
            action: currArgs.action,
          });
          _evalRequiredStatus(currentArgsForRequired, requiredMap);

          if (['Array', 'Object'].includes(currentArgsForRequired.fieldSchema.type)) {
            _evalRequiredStatusForObjectChildren(currentArgsForRequired, form, requiredMap);
          } else if (currArgs.fieldSchema.type === 'AssociativeArray') {
            _evalRequiredStatusForAssociativeArrayChildren(currentArgsForRequired, form, requiredMap);
          }
        });
    }

    function _evalRequiredStatus(args, requiredMap) {
      var requiredFn = AdpValidationUtils.getRequiredFn(args);

      try {
        requiredMap[args.path] = requiredFn();
      } catch (e) {
        requiredMap[args.path] = false;
        console.error('Error while evaluating required condition for: ', args, e);
      }
    }

    function _evalRequiredStatusForObjectChildren(args, form, requiredMap) {
      var isObjectRequired = requiredMap[args.path];
      if (isObjectRequired) {
        return;
      }

      if (_.isNull(args.data) && _hasRequiredFieldsInObject(args, requiredMap)) {
        _skipRequiredValidationForChildFields(args, form);
      }
    }

    function _hasRequiredFieldsInObject(args, requiredMap) {
      var objectFieldSchema = _.get(args.modelSchema.fields, args.schemaPath, {});

      var result = _.find(objectFieldSchema.fields, function (field, name) {
        if (field.showInForm && ['Array', 'Object'].includes(field.type)) {
          return false;
        }

        var nextPath = AdpPath.next(args.path, name);
        return requiredMap[nextPath];
      });

      return Boolean(result);
    }

    function _skipRequiredValidationForChildFields(args, form) {
      var objectFieldSchema = _.get(args.modelSchema.fields, args.schemaPath, {});

      _.each(objectFieldSchema.fields, function (field, name) {
        var isComplexType = ['Object', 'Array', 'AssociativeArray'].includes(field.type);
        if (field.showInForm && isComplexType) {
          return;
        }

        var childPath = AdpPath.next(args.path, name);
        var formField = _.get(form, childPath.split('.'), null);

        var notInDOM = formField === null;
        if (notInDOM) {
          return;
        }

        formField.$setValidity('required', true);
      });
    }

    function _evalRequiredStatusForAssociativeArrayChildren(args, form, requiredMap) {
      var isRequired = requiredMap[args.path];

      if (isRequired) {
        return;
      }

      setKeyFieldRequiredStatus(args, form);

      if (_.isNull(args.data) && _hasRequiredFieldsInObject(args, requiredMap)) {
        _skipRequiredValidationForChildFields(args, form);
      }
    }

    function setKeyFieldRequiredStatus(args, form) {
      var fieldPathInForm = args.path.split('.').concat('$key');
      var formField = _.get(form, fieldPathInForm, null);

      var notInDOM = formField === null;
      if (notInDOM) {
        return;
      }

      if (formField.$viewValue) {
        formField.$setValidity('required', true);
        return;
      }

      formField.$setValidity('required', _.isEmpty(args.data));
    }
  }
})();
