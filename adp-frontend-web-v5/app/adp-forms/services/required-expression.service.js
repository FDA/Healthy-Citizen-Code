;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('RequiredExpression', RequiredExpression);

  function RequiredExpression(
    AdpValidationUtils,
    AdpFormIteratorUtils,
    AdpFormDataUtils,
    AdpPath
  ) {
    return {
      eval: evaluateRequiredStatus,
    }

    function evaluateRequiredStatus(formParams, form) {
      var formData = formParams.row;
      var schema = formParams.modelSchema;

      var cleanedFormData = AdpFormDataUtils.cleanFormDataAndKeepArraysPositions(formData, schema);

      AdpFormIteratorUtils.traverseFormDataPostOrder(
        formData, schema, '',
        function (_formDataRef, field, path) {
          if (field.type === 'Schema') {
            return;
          }

          // shallow copy only, does not mutate any object inside please
          var currentFormParams = _.clone(formParams);
          currentFormParams.path = path;

          _evalRequiredStatus(currentFormParams);

          if (field.type === 'Array' || field.type === 'Object') {
            var objectData = _.get(cleanedFormData, path, null);
            _evalRequiredStatusForObjectChildren(currentFormParams, objectData, form);
          } else if (field.type === 'AssociativeArray') {
            var arrayData = _.get(cleanedFormData, path, null);
            _evalRequiredStatusForAssociativeArrayChildren(currentFormParams, arrayData, form);
          }
        });
    }

    function _evalRequiredStatusForObjectChildren(formParams, objectData, form) {
      var isObjectRequired = formParams.requiredMap[formParams.path];
      if (isObjectRequired) {
        return;
      }

      if (_.isNull(objectData) && _hasRequiredFieldsInObject(formParams, objectData)) {
        _skipRequiredValidationForChildFields(formParams, form);
      }
    }

    function _hasRequiredFieldsInObject(formParams) {
      var schemaPath = AdpPath.schemaPath(formParams.path);
      var field = _.get(formParams.modelSchema.fields, schemaPath, null);
      var result = _findRequiredFieldInObject(field, formParams);

      return !!result;
    }

    function _findRequiredFieldInObject(objectSchema, formParams) {
      var result = _.find(objectSchema.fields, function (field, name) {
        var isComplexType = field.type === 'Object' || field.type === 'Array';
        if (isComplexType && field.showInForm) {
          return false;
        }

        var nextPath = AdpPath.next(formParams.path, name);
        return formParams.requiredMap[nextPath];
      });

      return result;
    }

    function _skipRequiredValidationForChildFields(formParams, form) {
      var schemaPath = AdpPath.schemaPath(formParams.path);
      var field = _.get(formParams.modelSchema.fields, schemaPath, null);

      _.each(field.fields, function (field, name) {
        var isComplexType = ['Object', 'Array', 'AssociativeArray'].includes(field.type);
        if (isComplexType && field.showInForm) {
          return;
        }

        var childPath = AdpPath.next(formParams.path, name);
        var formField = _.get(form, childPath.split('.'), null);
        var notInDOM = formField === null;

        if (notInDOM) {
          return;
        }

        formField.$setValidity('required', true);
      });
    }

    function _evalRequiredStatus(formParams) {
      var requiredFn = AdpValidationUtils.getRequiredFn(formParams);
      try {
        formParams.requiredMap[formParams.path] = requiredFn();
      } catch (e) {
        formParams.requiredMap[formParams.path] = false;
        console.error('Error while evaluating required condition for: ', formParams, e);
      }
    }

    function _evalRequiredStatusForAssociativeArrayChildren(formParams, objectData, form) {
      var isRequired = formParams.requiredMap[formParams.path];

      if (isRequired) {
        return;
      }

      setKeyFieldRequiredStatus(formParams.path, objectData, form);

      if (_.isNull(objectData) && _hasRequiredFieldsInObject(formParams, objectData)) {
        _skipRequiredValidationForChildFields(formParams, form);
      }
    }

    function setKeyFieldRequiredStatus(path, arrayItemData, form) {
      var fieldPath = path.split('.').concat('$key');
      var formField = _.get(form, fieldPath, null);

      if (formField === null) {
        return;
      }

      if (formField.$viewValue) {
        formField.$setValidity('required', true);
        return ;
      }

      formField.$setValidity('required', _.isEmpty(arrayItemData));
    }
  }
})();
