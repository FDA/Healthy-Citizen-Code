;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldFactory', adpFormFieldFactory);

  // main adp fields factory directive
  function adpFormFieldFactory(
    $compile,
    AdpFieldsService
  ) {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFields: '=',
        adpFormData: '=',
        fieldSelection: '=',
        schema: '=',
        adpFormParams: '=?',
      },
      link: function (scope, element) {
        scope.uiProps = AdpFieldsService.getTypeProps(scope.adpField);
        var fieldWidth = scope.adpField.formWidth || 12;
        scope.className = 'col';

        // TODO: refactor
        // modelSchema - grouped fields
        // schema - original ungrouped schema
        scope.validationParams = {
          field: scope.adpField,
          fields: scope.adpFields,
          formData: scope.adpFormData,
          modelSchema: scope.adpFields,
          schema: scope.schema,
          $action: scope.adpFormParams && scope.adpFormParams.actionType
        };

        if (fieldWidth) {
          scope.className += ' col-' + fieldWidth;
        }

        var template = [
          '<adp-form-field-' + scope.uiProps.directiveType,
            'ng-class="[className]"',
            'ng-if="adpField.display"',
            'adp-form-data="adpFormData"',
            'adp-field-ui-props="uiProps"',
            'validation-params="validationParams"',
            'adp-field="adpField"',
          '>',
          '</adp-form-field-' + scope.uiProps.directiveType + '>'
        ].join(' ');

        element.replaceWith($compile(template)(scope));
      }
    }
  }
})();
