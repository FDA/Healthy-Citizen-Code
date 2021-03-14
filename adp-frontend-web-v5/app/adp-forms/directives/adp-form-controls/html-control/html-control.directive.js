(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('htmlControl', htmlControl);

  function htmlControl(
    AdpValidationUtils,
    ControlSetterGetter
  ) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/html-control/html-control.html',
      require: '^^form',
      link: function (scope) {
        var getterSetterFn = ControlSetterGetter(scope.args);
        scope.getterSetter = getterSetterFn;

        if (_.isNil(getterSetterFn())) {
          getterSetterFn(null);
        }
        setOptions();

        scope.isRequired = AdpValidationUtils.isRequired(scope.args.path, scope.formContext.requiredMap);

        function setOptions() {
          scope.editorsConfig = _.get(scope, 'args.fieldSchema.parameters.editor', {});
        }
      }
    }
  }
})();
