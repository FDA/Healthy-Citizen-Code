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
        adpFormData: '=',
        fieldSelection: '=',
        adpFormParams: '=?'
      },
      link: function (scope, element) {
        scope.uiProps = AdpFieldsService.getTypeProps(scope.adpField);
        var fieldWidth = scope.adpField.formWidth || 12;
        scope.className = 'col';

        if (fieldWidth) {
          scope.className += ' col-' + fieldWidth;
        }

        var template = [
          '<adp-form-field-' + scope.uiProps.directiveType,
            'ng-class="[className]"',
            'ng-if="adpField.display"',
            'adp-form-data="adpFormData"',
            'adp-field-ui-props="uiProps"',
            'adp-field="adpField">',
          '</adp-form-field-' + scope.uiProps.directiveType + '>'
        ].join(' ');

        element.replaceWith($compile(template)(scope));
      }
    }
  }
})();
