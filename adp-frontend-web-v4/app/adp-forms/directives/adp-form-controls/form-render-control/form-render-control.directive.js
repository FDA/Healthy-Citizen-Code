(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('formRenderControl', formRenderControl);

  function formRenderControl() {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/form-render-control/form-render-control.html',
      require: '^^form',
      link: function (scope) {
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

        function formRenderWatcherCondition() {
          return scope.field.formRender.watch.map(function (fieldName) {
            return ['adpFormData', fieldName].join('.');
          });
        }
      }
    }
  }
})();
