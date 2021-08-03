;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormGroupGrouping', adpFormGroupGrouping);

  function adpFormGroupGrouping(
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
      templateUrl: 'app/adp-forms/directives/adp-form-group/adp-form-group-grouping/adp-form-group-grouping.html',
      require: '^^form',
      link: function (scope, el, attrs, form) {
        scope.groupHasErrors = AdpFormService.groupHasErrors;
        scope.groupCompleted = AdpFormService.groupCompleted;
        scope.form = form;
        scope.formParams = _.get(scope, 'args.modelSchema.parameters', {});

        scope.getHeader = function (group) {
          var args = AdpUnifiedArgs.getArgsForGroup(group, scope.args);
          return AdpFieldsService.getHeaderRenderer(args);
        };

        scope.display = function(path) {
          return scope.formContext.visibilityMap[path];
        };
      }
    }
  }
})();
