;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('arrayControl', arrayControl);

  function arrayControl(AdpFieldsService, AdpFormService) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/array-control/array-control.html',
      require: '^^form',
      link: function (scope, element, attrs, formCtrl) {
        scope.fields = AdpFieldsService.getFormFields(scope.field.fields).notGrouped;
        scope.visibilityStatus = [];
        scope.form = formCtrl;
        scope.rootForm = AdpFormService.getRootForm(scope.form);
        scope.errorCount = [];

        scope.getData = getData;
        scope.setData = setData;
        scope.isEmpty = isEmpty;
        scope.add = add;
        scope.remove = remove;

        scope.getFields = getFields;
        scope.toggle = function (event, index) {
          event.preventDefault();
          event.stopPropagation();

          scope.visibilityStatus[index] = !scope.visibilityStatus[index];
        };

        if (scope.isEmpty()) {
          scope.setData([]);
          add();
        }

        scope.$watch(
          function () { return angular.toJson(scope.form); },
          function () {
            if (scope.rootForm.$submitted) {
              scope.errorCount = getData().map(function (_v, i) {
                var formToCount = scope.form[scope.field.keyName + i];
                var counter = AdpFormService.countErrors(formToCount);

                return counter;
              });
            }
          });

        function getData() {
          return scope.adpFormData[scope.field.keyName];
        }

        function setData(value) {
          return scope.adpFormData[scope.field.keyName] = value;
        }

        function isEmpty() {
          var data = getData();
          return _.isUndefined(data) || _.isNull(data) || _.isEmpty(data);
        }

        function add() {
          var fieldData = getData();
          fieldData.push({});
        }

        function remove(event, index) {
          event.preventDefault();

          var fieldData = getData();
          fieldData.splice(index, 1);
          scope.visibilityStatus.splice(index, 1);
        }

        function getFields(index) {
          var fields = _.clone(scope.fields);

          if (scope.field.required) {
            _.each(scope.fields, function (field) {
              field.required = index === 0;
            });
          }

          return fields;
        }
      }
    }
  }
})();
