(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('treeSelectorControl', treeSelectorControl);

  function treeSelectorControl(
    GraphqlTreeSelectorQuery,
    AdpUnifiedArgs,
    AdpValidationUtils,
    ControlSetterGetter
  ) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/tree-selector-control/tree-selector-control.html',
      require: '^^form',
      link: function (scope) {
        (function init() {
          var getterSetterFn = ControlSetterGetter(scope.args);
          scope.getterSetter = getterSetterFn;
          var val = getterSetterFn();
          if (_.isNil(val)) {
            getterSetterFn([]);
          }

          scope.isRequired = AdpValidationUtils.isRequired(scope.args.path, scope.formContext.requiredMap);
        })();
      }
    }
  }
})();
