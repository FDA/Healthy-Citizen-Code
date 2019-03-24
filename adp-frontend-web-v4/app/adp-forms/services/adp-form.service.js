;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpFormService', AdpFormService);

  function AdpFormService(
    AdpFieldsService,
    AdpValidationService,
    AdpFormIteratorUtils,
    AdpFormDataUtils,
    AdpFormHelpers
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

    // TODO: refactor arguments with formParams
    function compareFieldsWithShow(formData, schema, visibilityMap, $action) {
      AdpFormIteratorUtils.traverseFormDataPostOrder(
        formData, schema, '',
        function (formDataRef, currentField, path) {
          if (_.isUndefined(currentField.show)) {
            return;
          }

          var conditionParams = AdpFormHelpers.getHelperParams(path, formData, $action, schema);
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

    // TODO: refactor arguments with formParams
    function compareGroupsWithShow(formData, groupsSchema, $action, schema, visibilityMap) {
      _.each(groupsSchema, function (group) {
        if (_.isUndefined(group.show)) {
          return;
        }

        // form is not rendered
        if (_.isEmpty(formData)) {
          return;
        }

        _.each(group.fields, function (field) {
          var path = field.keyName;
          var groupName = group.keyName;
          // first level always so path === key
          visibilityMap[path] = visibilityMap[groupName];

          if (!visibilityMap[groupName]) {
            _.set(formData, path, null);
          }
        });
      });
    }

    function groupHasErrors(fieldGroup, form) {
      var hasError = false;

      _.each(fieldGroup, function (fieldSchema) {
        var field = form[fieldSchema.keyName];
        if (!field || hasError) return;

        hasError = field.$dirty && field.$invalid;
      });

      return hasError;
    }

    function groupCompleted(fieldGroup, form) {
      var completed = false;

      _.each(fieldGroup, function (fieldSchema) {
        var field = form[fieldSchema.keyName];
        if (!field || completed) return;

        completed = field.$dirty && _.isEmpty(field.$error);
      });

      return completed;
    }

    function setGroupDirty(fieldGroup, form) {
      _.each(fieldGroup, function (field) {
        if (!form[field.keyName]) return;

        if (field.type === 'Date') {
          form[field.keyName].$touched = true;
        }
        form[field.keyName].$setDirty();
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

    function _hasRequiredFieldsInObject(schema) {
      var requriedItem = _.find(schema.fields, function (field) {
        if (field.type === 'Object' || field.type === 'Array') {
          return false;
        }
        // refactor: required make conditional
        return field.required;
      });

      return !!requriedItem;
    }

    function _setValidityForObject(form, schema) {
      _.each(schema.fields, function (field) {
        if (field.type === 'Object' || field.type === 'Array') {
          return;
        }

        var formField = form[field.keyName];

        // check if form field is rendered
        if (_.isUndefined(formField)) {
          return;
        }

        formField.$setValidity('required', true);
      })
    }

    function forceCheckObjectRequired(formData, schema, form) {
      // option clearEmptyOnly to keep item in positions to match real data with copy
      // example
      // real data: { array: [{...}, {object: {...}}, {...}] }
      // cleaned copy: { array: [null, null, {}] }
      // to check if item in path 'array[2]' is empty, we need to keep empty items in its positions
      var cleanedFormData = AdpFormDataUtils.cleanFormData(formData, schema, {
        clearEmptyOnly: false
      });

      AdpFormIteratorUtils.traverseFormDataPostOrder(
        formData, schema, '',
        function (_formDataRef, currentField, path) {
          if (currentField.type !== 'Object' && currentField.type !== 'Array') {
            return;
          }

          if (currentField.required) {
            return;
          }

          var currentValue = _.get(cleanedFormData, path, null);

          // path.split('.') - angular form contains key-val objects, no arrays.
          // array[0] - is a key in form, not array with index 0
          var currentForm = _.get(form, path.split('.'), null);

          // check if form is rendered
          if (_.isNull(currentForm)) {
            return;
          }

          if (_.isNull(currentValue) && _hasRequiredFieldsInObject(currentField)) {
            _setValidityForObject(currentForm, currentField);
          }
        });
    }

    return {
      forceCheckObjectRequired: forceCheckObjectRequired,
      getType: getType,
      getTypeMap: getTypeMap,
      getFormFields: getFormFields,
      compareFieldsWithShow: compareFieldsWithShow,
      compareGroupsWithShow: compareGroupsWithShow,
      groupHasErrors: groupHasErrors,
      groupCompleted: groupCompleted,
      setGroupDirty: setGroupDirty,
      forceValidation: forceValidation,
      countErrors: countErrors,
      getRootForm: getRootForm,
    }
  }
})();
