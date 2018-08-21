;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('arrayControlsFactory', arrayControlsFactory);

  function arrayControlsFactory(
    $compile,
    AdpFieldsService
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        formData: '='
      },
      link: function (scope, element) {
        scope.uiProps = AdpFieldsService.getTypeProps(scope.field);
        scope.placeholder = true;
        scope.className = 'col';

        if (scope.field.formWidth) {
          scope.className += ' col-' + scope.field.formWidth;
        } else {
          scope.className += ' col-12'
        }

        var template = [
            '<adp-form-field-container ng-class="[className]" adp-field="field">',
              '<label>{{field.fullName}}</label>',

              '<' + scope.uiProps.directiveType + '-control',
                'adp-form-data="formData"',
                'ui-props="uiProps"',
                'field="field">',
                '</' + scope.uiProps.directiveType + '-control>',

              '<adp-messages adp-field="field"></adp-messages>',
            '</adp-form-field-container>',
        ].join(' ');

        element.replaceWith($compile(template)(scope));
      }
    }
  }
})();
