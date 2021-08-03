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
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-group/adp-form-group-accordion/adp-form-group-accordion.html',
      require: '^^form',
      link: function (scope, el, attrs, form) {
        scope.groupHasErrors = AdpFormService.groupHasErrors;
        scope.groupCompleted = AdpFormService.groupCompleted;
        scope.form = form;
        scope.formParams = _.assign(
          {},
          _.get(scope, 'args.modelSchema.parameters', {}),
          { heightStyle: 'content', collapsible: true }
        );

        scope.listOfFieldsForEachGroup = _.mapValues(scope.fields.groups, function (group) {
          return group.fields.map(function (field) {
            return AdpUnifiedArgs.next(scope.args, field.fieldName);
          });
        });

        scope.display = function(path) {
          return scope.formContext.visibilityMap[path];
        };

        scope.getHeader = function (group) {
          var args = AdpUnifiedArgs.getArgsForGroup(group, scope.args);
          return AdpFieldsService.getHeaderRenderer(args);
        };
      }
    }
  }
})();
