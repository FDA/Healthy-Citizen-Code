(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('codeControl', codeControl);

  function codeControl(
    AdpValidationUtils,
    ControlSetterGetter
  ) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/code-control/code-control.html',
      require: '^^form',
      link: function (scope) {
        var getterSetterFn = ControlSetterGetter(scope.args);
        scope.getterSetter = getterSetterFn;
        if (_.isNil(getterSetterFn())) {
          getterSetterFn('');
        }

        scope.isRequired = AdpValidationUtils.isRequired(scope.args.path, scope.formContext.requiredMap);
        scope.editorsConfig = _.get(scope, 'args.fieldSchema.parameters.codeEditor', {});

        if (scope.args.fieldSchema.type === 'Mixed') {
          scope.editorsConfig.mode = 'ace/mode/json5';
        }
      }
    }
  }
})();
