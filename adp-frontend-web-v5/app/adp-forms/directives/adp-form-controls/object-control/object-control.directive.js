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

        scope.getErrorCnt = function () {
          return AdpFormService.getErrorCounter(scope.formContext.errorCount, scope.args);
        };

        scope.toggle = function () {
          scope.isVisible = !scope.isVisible;
        };

        if (isEmpty()) {
          getterSetterFn({});
        }

        scope.subFormData = getterSetterFn();

        function isEmpty() {
          var data = getterSetterFn();
          return _.isNil(data)|| _.isEmpty(data);
        }
      }
    }
  }
})();
