(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('triStateBooleanControl', triStateBooleanControl);

  function triStateBooleanControl(
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
      templateUrl: 'app/adp-forms/directives/adp-form-controls/tri-state-boolean-control/tri-state-boolean-control.html',
      require: '^^form',
      link: function (scope) {
        var getterSetterFn = ControlSetterGetter(scope.args);
        scope.config = AdpFieldsService.configFromParameters(scope.args.fieldSchema, getDefaultSettings());

        function getDefaultSettings() {
          var initialValue = initialState();
          return {
            onInitialized: function (e) {
              if (e.component.option('value') === false) {
                e.component.setUndefinedNextTime = true;
              }
            },
            value: initialValue,
            onValueChanged: function (e) {
              if (e.component.skipOnValueChanged) {
                e.component.skipOnValueChanged = false;
                return;
              }

              if (e.component.setUndefinedNextTime) {
                e.component.setUndefinedNextTime = false;
                e.component.skipOnValueChanged = true;
                e.component.option('value', undefined);
                setValueToModel(undefined);
                return;
              }

              if (e.value === false) {
                e.component.setUndefinedNextTime = true;
              }
              setValueToModel(e.value);
            }
          }
        }


        function setValueToModel(val) {
          getterSetterFn(_.isUndefined(val) ? null : val);
        }

        function initialState() {
          return _.isNil(scope.args.data) ? undefined : scope.args.data;
        }
      }
    }
  }
})();
