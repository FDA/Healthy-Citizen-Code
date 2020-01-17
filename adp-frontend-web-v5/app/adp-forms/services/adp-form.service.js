;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpFormService', AdpFormService);

  function AdpFormService(
    AdpFieldsService,
    AdpValidationUtils,
    AdpFormIteratorUtils,
    AdpFormDataUtils,
    AdpUnifiedArgs,
    AdpPath
  ) {
    function getType(formParams) {
      var types = getTypeMap();
      var type = _.get(formParams, 'groupingType');
      type = type && type.toLowerCase();

      return types[type];
    }

    function getTypeMap() {
      return {
        'accordion': 'accordion',
        'wizard': 'wizard',
        'grouping': 'grouping'
      }
    }

    function getFormFields(fields, type) {
      if (type) {
        return AdpFieldsService.getFormGroupFields(fields);
      }

      return AdpFieldsService.getFormFields(fields);
    }

    // DEPRECATED
    // refactor: replace with formData traversal method from AdpFormIteratorUtils
    function _forEachField(form, callback) {
      // exclude ngModels, which are used only for forms
      if (_.isEmpty(form)) {
        return;
      }

      angular.forEach(form, function(field, key) {
        // not model and not form
        if (_.isUndefined(field) || _.isEmpty(field) || typeof field !== 'object') {
          return;
        }

        // exclude '$$parentForm' to avoid maxCallStack error
        if (key === '$$parentForm') {
          return;
        }

        // WORKAROUND: monkey checking
        var isForm = field.hasOwnProperty('$submitted');
        var isModel = field.hasOwnProperty('$modelValue');

        if (isModel) {
          callback(field);
        } else if (isForm) {
          _forEachField(field, callback);
        }
      });
    }

    function forceValidation(form) {
      _forEachField(form, function (field) {
        // field.$setDirty();
        field.$validate();
      });
    }

    function _createShowFnByPath(params) {
      // do not use - non context arguments will be removed
      var data = _.get(params.row, params.path, params.row);
      var row = params.row;
      var modelSchema = params.modelSchema;
      var action = params.action;

      return new Function('data, row, modelSchema, $action', 'return ' + modelSchema.show)
        .bind(params, data, row, modelSchema, action);
    }

    // params shape {
    //   formData
    //   schema
    //   groups
    //   visibilityMap
    //   actionType
    // }
    function evaluateShow(params) {
      _evaluateShowForFields(params);
      _clearGroups(params);
    }

    function _evaluateShowForFields(params) {
      var formData = params.formData;
      var schema = params.schema;

      AdpFormIteratorUtils.traverseFormDataPostOrder(
        formData, schema, '',
        function (formDataRef, currentField, path) {
          if (_.isUndefined(currentField.show)) {
            return;
          }
          var visibilityMap = params.visibilityMap;
          var conditionParams = AdpUnifiedArgs.getHelperParams({
            path: path,
            formData: formData,
            action:  params.actionType,
            schema: schema,
          });
          var displayConditionFn = _createShowFnByPath(conditionParams);

          try {
            visibilityMap[path] = displayConditionFn();
          } catch (e) {
            console.error('Error while evaluating show attribute for: ', e, currentField, conditionParams);
          }

          // form is not rendered
          if (_.isEmpty(formDataRef)) {
            return;
          }

          if (!visibilityMap[path]) {
            _.set(formDataRef, path, currentField.type === 'Array' ? {} : null);
          }
        });
    }

    function _clearGroups(params) {
      var groups = params.groups;
      var formData = params.formData;
      var visibilityMap = params.visibilityMap;

      _.each(groups, function (group) {
        if (_.isEmpty(formData) || _.isUndefined(group.show)) {
          return;
        }

        var isGroupVisible = visibilityMap[group.fieldName];

        _.each(group.fields, function (field) {
          if (field.show) {
            return;
          }

          var path = field.fieldName;

          if (field.type === 'Array') {
            _setArrayVisibilityInGroup(isGroupVisible, visibilityMap, formData, path);
          } else {
            _setPrimitiveVisibility(isGroupVisible, visibilityMap, formData, path);
          }
        });
      });
    }

    function _setArrayVisibilityInGroup(isVisible, visibilityMap, formData, path) {
      var arrayData = formData[path];

      _.forEach(arrayData, function (item, index) {
        var arrayPath = path + '[' + index + ']';
        if (!isVisible) {
          _.set(formData, arrayPath, {});
        }

        visibilityMap[arrayPath] = isVisible;
      });
    }

    function _setPrimitiveVisibility(isVisible, visibilityMap, formData, path) {
      if (!isVisible) {
        _.set(formData, path, null);
      }

      visibilityMap[path] = isVisible;
    }

    function groupHasErrors(fieldGroup, form) {
      var hasError = false;

      _.each(fieldGroup, function (fieldSchema) {
        var field = form[fieldSchema.fieldName];
        if (!field || hasError) return;

        hasError = field.$dirty && field.$invalid;
      });

      return hasError;
    }

    function groupCompleted(fieldGroup, form) {
      var completed = false;

      _.each(fieldGroup, function (fieldSchema) {
        var field = form[fieldSchema.fieldName];
        if (!field || completed) return;

        completed = field.$dirty && _.isEmpty(field.$error);
      });

      return completed;
    }

    function setGroupDirty(fieldGroup, form) {
      _.each(fieldGroup, function (field) {
        if (!form[field.fieldName]) return;

        if (field.type === 'Date') {
          form[field.fieldName].$touched = true;
        }
        form[field.fieldName].$setDirty();
      });
    }

    // structure of form is always flat
    // except when there are type=Array and type=Object
    function countErrors(form) {
      var counter = 0;

      _forEachField(form, function (field) {
        counter += field.$invalid;
        field.$setDirty();
      });

      return counter;
    }

    // refactor move to util for angular forms
    function getRootForm(form) {
      if (form.$name === 'form') {
        return form;
      }
      var root = form.$$parentForm;

      while (root.$name !== 'form') {
        root = root.$$parentForm;
      }

      return root;
    }

    function evaluateRequiredStatus(formParams, form) {
      var formData = formParams.row;
      var schema = formParams.modelSchema;

      // using option clearEmptyOnly to keep items in positions
      // example
      // real data: { array: [{...}, {object: {...}}, {...}] }
      // cleaned copy: { array: [null, null, {}] }
      // to check if item in path 'array[2]' is empty, we need to keep empty items in its positions
      var cleanedFormData = AdpFormDataUtils.cleanFormData(
        formData,
        schema,
        { clearEmptyOnly: false }
      );

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
        var isComplexType = field.type === 'Object' || field.type === 'Array';
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

    return {
      getType: getType,
      getTypeMap: getTypeMap,
      getFormFields: getFormFields,
      evaluateShow: evaluateShow,
      groupHasErrors: groupHasErrors,
      groupCompleted: groupCompleted,
      setGroupDirty: setGroupDirty,
      forceValidation: forceValidation,
      countErrors: countErrors,
      getRootForm: getRootForm,
      evaluateRequiredStatus: evaluateRequiredStatus,
    }
  }
})();
