;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('objectControl', objectControl);

  function objectControl(
    AdpValidationUtils,
    AdpFieldsService,
    AdpFormService,
    ControlSetterGetter
  ) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/object-control/object-control.html',
      require: '^^form',
      link: function (scope, element, attrs, formCtrl) {
        var getterSetterFn = ControlSetterGetter(scope.args);
        scope.fields = AdpFieldsService.getFormFields(scope.args.fieldSchema.fields).notGrouped;
        scope.form = formCtrl;
        scope.rootForm = AdpFormService.getRootForm(scope.form);
        scope.fieldName = _.get(scope, 'args.fieldSchema.fieldName');
        scope.isVisible = false;
        scope.errorCount = 0;
        scope.hasHeaderRender = AdpFieldsService.hasHedearRenderer(scope.args.fieldSchema);

        scope.getHeader = function() {
          return AdpFieldsService.getHeaderRenderer(scope.args);
        };

        scope.toggle = function () {
          scope.isVisible = !scope.isVisible;
        };

        if (isEmpty()) {
          getterSetterFn({});
        }

        scope.subFormData = getterSetterFn();

        scope.$watch(
          function () { return angular.toJson(scope.rootForm); },
          function () {
            if (scope.rootForm.$submitted) {
              var formToCount = scope.form[scope.fieldName];
              scope.errorCount = AdpFormService.countErrors(formToCount);
            }
          });

        function isEmpty() {
          var data = getterSetterFn();
          return _.isNil(data)|| _.isEmpty(data);
        }
      }
    }
  }
})();
