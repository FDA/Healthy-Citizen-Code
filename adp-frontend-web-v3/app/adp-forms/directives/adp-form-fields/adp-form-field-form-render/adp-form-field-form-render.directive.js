(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldFormRender', adpFormFieldString);

  function adpFormFieldString() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-form-render/adp-form-field-form-render.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.field = scope.adpField;
        scope.adpFormData[scope.field.keyName] = scope.adpFormData[scope.field.keyName] || '';

        (function init() {
          renderField();

          if (!_.isUndefined(scope.field.formRender.watch)) {
            addWatcher();
          }
        })();

        function renderField() {
          var field = scope.field;
          var renderName = field.formRender.formRenderer;

          var renderFn = appModelHelpers.FormRenderers[renderName];
          scope.fieldView = renderFn(getFieldData(), scope.adpFormData, field);
        }

        function getFieldData() {
          return scope.adpFormData[scope.field.keyName];
        }

        function addWatcher() {
          scope.$watchGroup(formRenderWatcherCondition(), renderField)
        }

        function formRenderWatcherCondition(value) {
          return scope.field.formRender.watch.map(function (fieldName) {
            return ['adpFormData', fieldName].join('.');
          });
        }
      }
    }
  }
})();
