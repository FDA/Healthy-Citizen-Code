(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('stringArrayControl', stringArrayControl);

  function stringArrayControl(
    StringArrayEditorConfig,
    AdpValidationUtils,
    AdpFieldsService,
    ControlSetterGetter
  ) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/string-array-control/string-array-control.html',
      require: '^^form',
      link: function (scope) {
        var getterSetterFn = ControlSetterGetter(scope.args);
        scope.getterSetter = function (e) {
          if (arguments.length) {
            getterSetterFn(e.value);
          }
          return getterSetterFn();
        };

        scope.isRequired = AdpValidationUtils.isRequired(scope.args.path, scope.formContext.requiredMap);
        scope.config = getConfig(scope.field);

        function getConfig(field) {
          var fieldData = getterSetterFn();
          var defaults = StringArrayEditorConfig(scope.args, fieldData, scope.getterSetter);
          return AdpFieldsService.configFromParameters(field, defaults);
        }
      }
    }
  }
})();
