;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('dateControl', dateControl);

  function dateControl(
    AdpValidationUtils,
    AdpFieldsService
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '<',
        adpFormData: '<',
        uiProps: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/date-control/date-control.html',
      require: '^^form',
      link: function (scope, el) {
        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);

        (function init() {
          var config = getConfig(scope.field);
          var control = el.find('.js-field').dxDateBox(config);

          scope.$on('$destroy', function () {
            scope.instance.dispose();
          });
        })();

        function getConfig(field) {
          var defaults = getOptions(field);
          return AdpFieldsService.configFromParameters(field, defaults);
        }

        getOptions(scope.field);


      }
    }
  }
})();
