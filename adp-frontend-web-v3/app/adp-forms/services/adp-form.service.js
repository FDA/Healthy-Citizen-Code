;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpFormService', AdpFormService);

  function AdpFormService(AdpFieldsService) {
    function getType(formParams) {
      var types = getTypeMap();
      var type = formParams && formParams.groupingType.toLowerCase();

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

    function forceValidation(fields, form) {
      var fieldsToCheck;
      if (fields.notGrouped) {
        fieldsToCheck = _.reduce(fields.groups, function (result, field) {
          return result.concat(field.children);
        }, []);

        fieldsToCheck = fields.notGrouped.concat(fieldsToCheck);
      } else {
        fieldsToCheck = fields;
      }

      fieldsToCheck.forEach(function (field) {
        if (field.keyName in form) {
          form[field.keyName].$validate();
        }
      });
    }

    function filterFieldsWithShow(fields, type) {
      var hasGrouping = !!type;
      var filteredFields = [];

      var filterCb = function (childField) {
        if (!_.isUndefined(childField.show)) {
          filteredFields.push(childField);
        }
      };

      // FIXME: keep same structure for all types of fields
      // { groups[field], notGrouped[field]
      // groups must be empty if there is no grouping defined for model
      if (hasGrouping) {
        _.each(fields.groups, function (field) {
          _.each(field.children, filterCb);
        });

        _.each(fields.notGrouped, filterCb);
      } else {
        filteredFields = _.filter(fields, function (field) {
          return !_.isUndefined(field.show);
        });
      }

      return filteredFields;
    }

    function compareFieldsWithShow(fieldsWithShow, formData) {
      _.each(fieldsWithShow, function (field) {
        var ruleExpression = field.show;
        var data = formData[field.keyName];
        var row = formData;
        var modelSchema = field;
        var displayConditionFn = new Function('data, row, modelSchema', 'return ' + ruleExpression);

        field.display = displayConditionFn(data, row, modelSchema);

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

        hasError = field.$dirty && !_.isEmpty(field.$error);
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

    return {
      getType: getType,
      getTypeMap: getTypeMap,
      getFormFields: getFormFields,
      filterFieldsWithShow: filterFieldsWithShow,
      compareFieldsWithShow: compareFieldsWithShow,
      groupHasErrors: groupHasErrors,
      groupCompleted: groupCompleted,
      setGroupDirty: setGroupDirty,
      forceValidation: forceValidation
    }
  }
})();
