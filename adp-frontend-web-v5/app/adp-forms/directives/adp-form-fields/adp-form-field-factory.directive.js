;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldFactory', adpFormFieldFactory);

  // main adp fields factory directive
  function adpFormFieldFactory(
    $compile,
    AdpFieldsService,
    AdpPath
  ) {
    return {
      restrict: 'E',
      scope: {
        adpField: '<',
        adpFields: '<',
        adpFormData: '<',
        schema: '<',
        validationParams: '<'
      },
      link: function (scope, element) {
        scope.uiProps = AdpFieldsService.getUiProps(scope.adpField);

        // FORM PARAMS
        var formParams = {
          path: AdpPath.next(scope.validationParams.formParams.path, scope.adpField.fieldName),
          row: scope.validationParams.formParams.row,
          fieldSchema: scope.validationParams.formParams.fieldSchema,
          modelSchema: scope.validationParams.formParams.modelSchema,
          action: scope.validationParams.formParams.action,
          visibilityMap: scope.validationParams.formParams.visibilityMap,
          requiredMap: scope.validationParams.formParams.requiredMap,
        };

        // default value
        formParams.visibilityMap[formParams.path] = true;
        scope.display = function() {
          return formParams.visibilityMap[formParams.path];
        };

        // DEPRECATED: will be replaced with formParams
        // validationParams fields naming is wrong, use formParams instead
        // modelSchema - grouped fields
        // schema - original ungrouped schema
        scope.nextValidationParams = {
          field: scope.adpField,
          fields: scope.adpFields,
          formData: scope.adpFormData,
          fieldSchema: scope.adpFields,
          schema: scope.schema,
          $action: formParams.action,

          formParams: formParams
        };

        var fieldWidth = scope.adpField.formWidth || 12;
        var className = 'col col-' + fieldWidth

        if (fieldWidth) {

        }

        var template = [
          '<adp-form-field-' + scope.uiProps.directiveType,
            'class="' + className + '"',
            'ng-if="display()"',
            'adp-form-data="::adpFormData"',
            'adp-field-ui-props="::uiProps"',
            'validation-params="::nextValidationParams"',
            'adp-field="::adpField"',
          '>',
          '</adp-form-field-' + scope.uiProps.directiveType + '>'
        ].join(' ');

        element.replaceWith($compile(template)(scope));
      }
    }
  }
})();
