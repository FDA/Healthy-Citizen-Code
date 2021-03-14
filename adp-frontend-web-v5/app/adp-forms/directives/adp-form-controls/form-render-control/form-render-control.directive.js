(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('formRenderControl', formRenderControl);

  function formRenderControl(
    AdpValidationUtils,
    $sce,
    ControlSetterGetter,
    $timeout
  ) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/form-render-control/form-render-control.html',
      require: '^^form',
      link: function (scope, el) {
        var getterSetterFn = ControlSetterGetter(scope.args);
        scope.getterSetter = getterSetterFn;

        if (_.isUndefined(getterSetterFn())) {
          getterSetterFn(null);
        }

        (function init() {
          $timeout(renderField);
          var observablePaths = _.get(scope, 'args.fieldSchema.formRender.watch', []);
          if (_.isEmpty(observablePaths)) {
            return;
          }

          var watchExpr = observablePaths.map(getViewValueFn);
          scope.$watchGroup(watchExpr, renderField);
        })();

        function renderField() {
          var field = scope.args.fieldSchema;
          var renderName = _.get(field, 'formRender.formRenderer');
          var renderFn = _.get(window, 'appModelHelpers.FormRenderers.' + renderName);

          var compatibilityArgs = [scope.args.data, scope.args.row, scope.args.modelSchema];
          var contents = $('<div class="render-content">')
            .append(renderFn.apply(scope.args, compatibilityArgs));

          var contentEl = el.find('.render-content');
          if (contentEl.length) {
            contentEl.replaceWith(contents);
          } else {
            el.find('[form-render-view="' + scope.args.path + '"]')
              .append(contents);
          }
        }

        function getViewValueFn(path) {
          return function () {
            var pathToValue = path + '.$viewValue';
            return _.get(scope.formContext.rootForm, toFormPath(pathToValue), null);
          }
        }

        function toFormPath(path) {
          return path.split('.');
        }
      }
    }
  }
})();
