;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormGroupAccordion', adpFormGroupAccordion);

    function adpFormGroupAccordion(
      AdpFieldsService,
      AdpFormService,
      AdpUnifiedArgs
    ) {
    return {
      restrict: 'E',
      scope: {
        fields: '<',
        formData: '<',
        formParams: '<',
        schema: '<',
        validationParams: '<'
      },
      templateUrl: 'app/adp-forms/directives/adp-form-group/adp-form-group-accordion/adp-form-group-accordion.html',
      require: '^^form',
      link: function (scope, el, attrs, form) {
        scope.groupHasErrors = AdpFormService.groupHasErrors;
        scope.groupCompleted = AdpFormService.groupCompleted;
        scope.form = form;

        scope.getHeader = function (group) {
          var args = AdpUnifiedArgs.getHelperParamsWithConfig({
            path: group.fieldName,
            action: scope.validationParams.formParams.action,
            formData: scope.formData,
            schema: scope.schema,
          });
          args.data = getData(group);

          return AdpFieldsService.getHeaderRenderer(args);
        };

        scope.display = function(path) {
          var visibilityMap = scope.validationParams.formParams.visibilityMap;
          return visibilityMap[path];
        };

        function getData(group) {
          var data = {};

          _.each(group.fields, function (f) {
            data[f.fieldName] = scope.formData[f.fieldName];
          });

          return data;
        }
      }
    }
  }
})();
