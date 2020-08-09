(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldFile', adpFormFieldString);

  function adpFormFieldString() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-file/adp-form-field-file.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.fakeModel = null;
        scope.field = scope.adpField;
        if (scope.field.type.indexOf('[]') > -1) {
          scope.field['arguments'].multiple = true;
        }

        if (_.isUndefined(scope.adpFormData[scope.field.keyName])) {
          scope.adpFormData[scope.field.keyName] = [];
        }

        scope.form = formCtrl;
        scope.uiProps = scope.adpFieldUiProps;
      }
    }
  }
})();
