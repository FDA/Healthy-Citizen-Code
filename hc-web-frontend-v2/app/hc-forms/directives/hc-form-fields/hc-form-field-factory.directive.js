;(function () {
  'use strict';

  angular
    .module('app.hcForms')
    .directive('hcFormFieldFactory', hcFormFieldFactory);

  // main hc fields factory directive
  function hcFormFieldFactory(
    $compile,
    HcFieldsService
  ) {
    return {
      restrict: 'E',
      scope: {
        hcField: '=',
        hcFormData: '='
      },
      link: function (scope, element) {
        scope.uiProps = HcFieldsService.getTypeProps(scope.hcField);

        var template ='<hc-form-field-' + scope.uiProps.directiveType + ' ' +
                        'hc-form-data="hcFormData"' +
                        'hc-field-ui-props="uiProps"' +
                        'hc-field="hcField">' +
                      '</hc-form-field-' + scope.uiProps.directiveType + '>';

        element.replaceWith($compile(template)(scope));
      }
    }
  }
})();
