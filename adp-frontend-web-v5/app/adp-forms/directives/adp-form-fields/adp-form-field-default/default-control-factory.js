(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('defaultControlFactory', defaultControlFactory);

  function defaultControlFactory(
    DX_CONTROLS,
    OTHER_FIELDS,
    $compile
  ) {
    return {
      restrict: 'E',
      scope: false,
      compile: function() {
        return function(scope, iElement) {
          var directiveType;
          var field = scope.args.fieldSchema;
          var isDxControl = _.flatten(_.values(DX_CONTROLS)).includes(field.type);

          if (field.formRender) {
            directiveType = 'form-render';
          } else if (field.list) {
            directiveType = OTHER_FIELDS.List;
          } else if (isDxControl) {
            directiveType = 'dx-field';
          } else {
            directiveType = OTHER_FIELDS[field.type];
          }

          var tpl = [
            '<' + directiveType + '-control',
              'args="::args"',
              'form-context="::formContext">',
            '</' + directiveType + '-control>',
          ].join(' ');

          iElement.replaceWith($compile(tpl)(scope));
        };
      },
    }
  }
})();
