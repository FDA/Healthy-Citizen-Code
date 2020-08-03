;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('arrayControlsFactory', arrayControlsFactory);

  function arrayControlsFactory(
    $compile,
    AdpFieldsService,
    AdpPath,
    visibilityUtils
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
        scope.uiProps = AdpFieldsService.getUiProps(scope.field);
        scope.placeholder = true;
        scope.className = 'col';

        // FORM PARAMS
        var formParams = {
          path: AdpPath.next(scope.validationParams.formParams.path, scope.field.fieldName, scope.index),
          row: scope.validationParams.formParams.row,
          modelSchema: scope.validationParams.formParams.modelSchema,
          action: scope.validationParams.formParams.action,
          visibilityMap: scope.validationParams.formParams.visibilityMap,
          requiredMap: scope.validationParams.formParams.requiredMap,
        };

        // DEPRECATED: will be replaced with formParams
        // validationParams fields naming is wrong, use formParams instead
        // fieldSchema - grouped fields
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

        // default value
        formParams.visibilityMap[formParams.path] = true;
        scope.display = function() {
          return formParams.visibilityMap[formParams.path];
        };

        scope.showLabel = function(field) {
          if (['Array', 'AssociativeArray'].includes(field.type)) {
            return visibilityUtils.arrayHasVisibleChild(getData(), scope.nextValidationParams);
          }

          return field.type !== 'Boolean';
        };

        function getData() {
          return scope.formData[scope.field.fieldName];
        }

        if (scope.field.formWidth) {
          scope.className += ' col-' + scope.field.formWidth;
        } else {
          scope.className += ' col-12'
        }

        var template = [
            '<adp-form-field-container ' +
              'ng-if="display()"',
              'ng-class="[className]"',
              'ng-field-name="{{field.fieldName}}"',
              'adp-field="field">',
              '<label ng-if="showLabel(field)">{{field.fullName}}</label>',

              '<adp-required-mark ng-if="showLabel(field)" validation-params="nextValidationParams"></adp-required-mark>',

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
