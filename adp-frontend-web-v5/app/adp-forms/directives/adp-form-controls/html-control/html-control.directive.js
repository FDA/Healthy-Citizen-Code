(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('htmlControl', htmlControl);

  function htmlControl(AdpValidationUtils) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/html-control/html-control.html',
      require: '^^form',
      link: function (scope) {
        if (_.isUndefined(getData())) {
          setData(null);
        }
        setOptions();

        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
        scope.getData = getData;

        function setOptions() {
          var defaults = {
            removeButtons: 'Image',
            removePlugins: 'flash',
          };

          var opts = _.get(scope, 'field.parameters.editor', {});
          scope.editorsConfig = _.defaults(defaults, opts);
        }

        function getData() {
          return scope.adpFormData[scope.field.fieldName];
        }

        function setData(value) {
          return scope.adpFormData[scope.field.fieldName] = value;
        }
      }
    }
  }
})();
