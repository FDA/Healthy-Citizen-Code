;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('objectControl', objectControl);

  function objectControl(
    AdpValidationUtils,
    AdpFieldsService,
    AdpFormService
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '=',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/object-control/object-control.html',
      require: '^^form',
      link: function (scope, element, attrs, formCtrl) {
        scope.fields = AdpFieldsService.getFormFields(scope.field.fields).notGrouped;
        scope.form = formCtrl;
        scope.rootForm = AdpFormService.getRootForm(scope.form);
        scope.isVisible = false;
        scope.errorCount = 0;
        scope.subSchema = scope.validationParams.schema.fields[scope.field.fieldName];

        // FORM PARAMS
        var formParams = {
          path: scope.validationParams.formParams.path,
          row: scope.validationParams.formParams.row,
          modelSchema: scope.validationParams.formParams.modelSchema,
          action: scope.validationParams.formParams.action,
          visibilityMap: scope.validationParams.formParams.visibilityMap,
          requiredMap: scope.validationParams.formParams.requiredMap,
        };

        // DEPRECATED: will be replaced with formParams
        // validationParams fields naming is wrong, use formParams instead
        // modelSchema - grouped fields
        // schema - original ungrouped schema
        scope.nextValidationParams = {
          field: scope.adpField,
          fields: scope.adpFields,
          formData: scope.adpFormData,
          modelSchema: scope.adpFields,
          schema: scope.schema,
          $action: scope.adpFormParams && scope.adpFormParams.actionType,

          formParams: formParams
        };

        scope.getHeader = function() {
          scope.hasHeaderRender = AdpFieldsService.hasHedearRenderer(scope.field);

          var params = {
            fieldData: getData(),
            formData: scope.adpFormData,
            fieldSchema: scope.field
          };

          return AdpFieldsService.getHeaderRenderer(params);
        };

        scope.toggle = function () {
          scope.isVisible = !scope.isVisible;
        };

        // var requiredFn = AdpValidationUtils.isRequired(scope.validationParams.formParams);

        if (isEmpty()) {
          setData({})
        }

        scope.subFormData = getData();

        scope.$watch(
          function () { return angular.toJson(scope.rootForm); },
          function () {
            if (scope.rootForm.$submitted) {
              var formToCount = scope.form[scope.field.fieldName];
              scope.errorCount = AdpFormService.countErrors(formToCount);
            }
          });

        function isEmpty() {
          var data = getData();
          return _.isUndefined(data) || _.isNull(data) || _.isEmpty(data);
        }

        function getData() {
          return scope.adpFormData[scope.field.fieldName];
        }

        function setData(value) {
          return scope.adpFormData[scope.field.fieldName] = value;
        }
      }
    }
  }
})();
