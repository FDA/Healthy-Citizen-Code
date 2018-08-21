;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('objectControl', objectControl);

  function objectControl(AdpFieldsService, AdpFormService) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/object-control/object-control.html',
      require: '^^form',
      link: function (scope, element, attrs, formCtrl) {
        scope.fields = AdpFieldsService.getFormFields(scope.field.fields).notGrouped;
        scope.form = formCtrl;
        scope.rootForm = AdpFormService.getRootForm(scope.form);
        scope.isVisible = false;
        scope.errorCount = 0;

        scope.toggle = function () {
          scope.isVisible = !scope.isVisible;
        };

        if (scope.field.required) {
          scope.fields.forEach(function (field) {
            field.required = true;
          });
        }

        if (isEmpty()) {
          setData({})
        }

        scope.subFormData = getData();

        scope.$watch(
          function () { return angular.toJson(scope.rootForm); },
          function () {
            if (scope.rootForm.$submitted) {
              var formToCount = scope.form[scope.field.keyName];
              scope.errorCount = AdpFormService.countErrors(formToCount);
            }
          });

        function isEmpty() {
          var data = getData();
          return _.isUndefined(data) || _.isNull(data) || _.isEmpty(data);
        }

        function getData() {
          return scope.adpFormData[scope.field.keyName];
        }

        function setData(value) {
          return scope.adpFormData[scope.field.keyName] = value;
        }
      }
    }
  }
})();
