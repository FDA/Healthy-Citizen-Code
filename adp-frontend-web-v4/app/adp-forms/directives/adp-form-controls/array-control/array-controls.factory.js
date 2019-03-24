;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('arrayControlsFactory', arrayControlsFactory);

  function arrayControlsFactory(
    $compile,
    AdpFieldsService,
    AdpPath
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        formData: '=',
        validationParams: '=',
        index: '='
      },
      link: function (scope, element) {
        scope.uiProps = AdpFieldsService.getTypeProps(scope.field);
        scope.placeholder = true;
        scope.className = 'col';

        // FORM PARAMS
        var formParams = {
          path: AdpPath.next(scope.validationParams.formParams.path, scope.field.keyName, scope.index),
          row: scope.validationParams.formParams.row,
          modelSchema: scope.validationParams.formParams.modelSchema,
          action: scope.validationParams.formParams.action,
          visibilityMap: scope.validationParams.formParams.visibilityMap,
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
          field: scope.field,
          fields: scope.validationParams.fields,
          formData: scope.formData,
          modelSchema: scope.validationParams.fields,
          schema: scope.validationParams.schema,
          $action: scope.validationParams.$action,

          formParams: formParams
        };

        if (scope.field.formWidth) {
          scope.className += ' col-' + scope.field.formWidth;
        } else {
          scope.className += ' col-12'
        }

        var template = [
            '<adp-form-field-container ng-if="display()" ng-class="[className]" adp-field="field">',
              '<label>{{field.fullName}}</label>',

              '<adp-required-mark validation-params="nextValidationParams"></adp-required-mark>',

              '<' + scope.uiProps.directiveType + '-control',
                'adp-form-data="formData"',
                'ui-props="uiProps"',
                'field="field"',
                'validation-params="nextValidationParams"',
              '>',
             '</' + scope.uiProps.directiveType + '-control>',

              '<adp-messages adp-field="field"></adp-messages>',
            '</adp-form-field-container>',
        ].join(' ');

        element.replaceWith($compile(template)(scope));
      }
    }
  }
})();
