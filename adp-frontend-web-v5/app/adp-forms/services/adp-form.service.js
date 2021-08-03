;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpFormService', AdpFormService);

  function AdpFormService() {
    function getGroupingType(args) {
      var group = _.get(args, 'modelSchema.parameters.groupingType') || '';
      return group.toLowerCase();
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

    function countErrors(form, counterArg) {
      if (_.isEmpty(form)) {
        return;
      }
      var counter = counterArg || { cnt: 0 };

      angular.forEach(form.$getControls(), function(field) {
        var isForm = !!field.$$controls;

        if (isForm) {
          var nextCounter = { cnt: 0 };
          counter[field.$name] = countErrors(field, nextCounter);
          counter.cnt += counter[field.$name].cnt;
          return;
        }

        counter.cnt += field.$invalid;
      });

      return counter;
    }

    function setFormDirty(form) {
      _forEachAngularFormField(form, function (field) {
        field.$setDirty();
      });
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

    function getErrorCounter(errorCntObj, args, index) {
      var path = _.isNumber(index) ?
        args.path + '[' + index + ']' :
        args.path;

      var formPath = path.split('.');
      formPath.push('cnt');

      return _.get(errorCntObj, formPath, 0);
    }

    return {
      getGroupingType: getGroupingType,
      groupHasErrors: groupHasErrors,
      groupCompleted: groupCompleted,
      setGroupDirty: setGroupDirty,
      forceValidation: forceValidation,
      countErrors: countErrors,
      getRootForm: getRootForm,
      setFormDirty: setFormDirty,
      getErrorCounter: getErrorCounter,
    }
  }
})();
