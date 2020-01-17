;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormGroupAccordion', adpFormGroupAccordion);

    function adpFormGroupAccordion(
      AdpFieldsService,
      AdpFormService
    ) {
    return {
      restrict: 'E',
      scope: {
        fields: '=',
        formData: '=',
        formParams: '=',
        schema: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-group/adp-form-group-accordion/adp-form-group-accordion.html',
      require: '^^form',
      link: function (scope, el, attrs, form) {
        scope.groupHasErrors = AdpFormService.groupHasErrors;
        scope.groupCompleted = AdpFormService.groupCompleted;
        scope.form = form;

        scope.getHeader = function (group) {
          var params = {
            fieldData: getData(group),
            formData: scope.formData,
            fieldSchema: group,
          };

          return AdpFieldsService.getHeaderRenderer(params);
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
