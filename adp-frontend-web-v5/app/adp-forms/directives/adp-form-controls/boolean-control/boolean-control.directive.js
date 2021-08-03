;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('booleanControl', booleanControl);

  function booleanControl(
    AdpValidationUtils,
    ControlSetterGetter
  ) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/boolean-control/boolean-control.html',
      require: '^^form',
      link: function (scope) {
        var getterSetterFn = ControlSetterGetter(scope.args);
        scope.getterSetter = getterSetterFn;

        // NOTE: control implemented with input[type=hidden] to map dx-checkbox value to model
        // reason: current Boolean control has only two state: null, true
        // but dx-checkbox has tree: true, false, undefined
        function mapValueToModel(value) {
          var valueForModel = value === false ? null : true;
          getterSetterFn(valueForModel);
        }

        scope.isRequired = AdpValidationUtils.isRequired(scope.args.path, scope.formContext.requiredMap);

        scope.config = {
          value: !!getterSetterFn(),
          switchedOnText: 'YES',
          switchedOffText: 'NO',
          onValueChanged: function (e) {
            mapValueToModel(e.value);
          }
        }
      }
    }
  }
})();
