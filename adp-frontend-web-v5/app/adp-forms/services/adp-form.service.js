;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpFormService', AdpFormService);

  function AdpFormService() {
    function getGroupingType(formParams) {
      var types = _getTypeMap();
      var type = _.get(formParams, 'groupingType');
      type = type && type.toLowerCase();

      return types[type];
    }

    function _getTypeMap() {
      return {
        'accordion': 'accordion',
        'wizard': 'wizard',
        'grouping': 'grouping'
      }
    }

    function _forEachAngularFormField(form, callback) {
      if (_.isEmpty(form)) {
        return;
      }

      angular.forEach(form.$getControls(), function(field) {
        var isForm = !!field.$$controls;

        if (isForm) {
          _forEachAngularFormField(field, callback);
        } else {
          callback(field);
        }
      });
    }

    function forceValidation(form) {
      _forEachAngularFormField(form, function (field) {
        field.$validate();
      });
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

    function countErrors(form) {
      var counter = 0;

      _forEachAngularFormField(form, function (field) {
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

    return {
      getGroupingType: getGroupingType,
      groupHasErrors: groupHasErrors,
      groupCompleted: groupCompleted,
      setGroupDirty: setGroupDirty,
      forceValidation: forceValidation,
      countErrors: countErrors,
      getRootForm: getRootForm,
    }
  }
})();
