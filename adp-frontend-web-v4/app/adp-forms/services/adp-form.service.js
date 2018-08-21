;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpFormService', AdpFormService);

  function AdpFormService(AdpFieldsService) {
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

    function filterFieldsWithShow(fields) {
      var filteredFields = [];

      var filterCb = function (childField) {
        if (_.isUndefined(childField.show)) {
          return;
        }

        filteredFields.push(childField);
      };

      if ('notGrouped' in fields) {
        _.each(fields.notGrouped, filterCb);
      }

      if ('groups' in fields) {
        _.each(fields.groups, function (field) {
          _.each(field.fields, filterCb);
        });
      }

      return filteredFields;
    }

    function compareFieldsWithShow(fieldsWithShow, formData, formParams) {
      _.each(fieldsWithShow, function (field) {
        var ruleExpression = field.show;
        var data = formData[field.keyName];
        var row = formData;
        var modelSchema = field;
        var $action = formParams.actionType;

        var displayConditionFn = new Function('data, row, modelSchema, $action', 'return ' + ruleExpression);
        field.display = displayConditionFn(data, row, modelSchema, $action);

        if (!field.display) {
          formData[field.keyName] = '';
        }
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
      fieldGroup.forEach(function (field) {
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

    return {
      getType: getType,
      getTypeMap: getTypeMap,
      getFormFields: getFormFields,
      filterFieldsWithShow: filterFieldsWithShow,
      compareFieldsWithShow: compareFieldsWithShow,
      groupHasErrors: groupHasErrors,
      groupCompleted: groupCompleted,
      setGroupDirty: setGroupDirty,
      forceValidation: forceValidation,
      countErrors: countErrors,
      getRootForm: getRootForm
    }
  }
})();
