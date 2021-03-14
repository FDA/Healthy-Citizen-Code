(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('fileControl', fileControl);

  function fileControl(
    AdpValidationUtils,
    ControlSetterGetter
  ) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/file-control/file-control.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        var getterSetterFn = ControlSetterGetter(scope.args);
        scope.getterSetter = getterSetterFn;
        scope.form = formCtrl;
        scope.fakeModel = null;
        scope.isRequired = AdpValidationUtils.isRequired(scope.args.path, scope.formContext.requiredMap);

        (function init() {
          var controlOptions = _.get(scope, 'args.fieldSchema.arguments', {});
          if (_.isNil(controlOptions)) {
            _.set(scope, 'args.fieldSchema.arguments', {});
          }

          _.set(scope, 'args.fieldSchema.arguments.multiple', scope.args.fieldSchema.type.includes('[]'));

          if (_.isNil(getterSetterFn())) {
            getterSetterFn([]);
          }
        })();
      }
    }
  }
})();
