;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('booleanControl', booleanControl);

  function booleanControl(AdpValidationUtils) {
    return {
      restrict: 'E',
      scope: {
        field: '<',
        adpFormData: '<',
        uiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/boolean-control/boolean-control.html',
      require: '^^form',
      link: function (scope) {
        function setData(value) {
          return scope.adpFormData[scope.field.fieldName] = value;
        }

        function getData() {
          return scope.adpFormData[scope.field.fieldName];
        }

        // NOTE: control implemented with input[type=hidden] to map dx-checkbox value to model
        // reason: current Boolean control has only two state: null, true
        // but dx-checkbox has tree: true, false, undefined
        function mapValueToModel(value) {
          var valueForModel = value === false ? null : true;
          setData(valueForModel);
        }

        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);

        scope.config = {
          value: _.isNil(getData()) ? false : true,
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
