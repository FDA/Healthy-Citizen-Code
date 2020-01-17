;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('listControl', listControl);

  function listControl(
    AdpValidationUtils,
    AdpFieldsService
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '=',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/list-control/list-control.html',
      require: '^^form',
      link: function (scope) {
        (function init() {
          scope.listOfOptions = getListOfOptions(scope.field);
          scope.config = getConfig(scope.field, scope.listOfOptions);
          scope.directiveType = defineDirectiveType(scope.field);

          scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);

          bindWatcher(scope.field, scope.listOfOptions);
        })();

        function getListOfOptions(field) {
          return AdpFieldsService.getListOfOptions(field.list);
        }

        function getConfig(field, listOfOptions) {
          return {
            value: scope.adpFormData[field.fieldName],
            valueExpr: 'value',
            displayExpr: 'label',
            elementAttr: {
              class: 'adp-select-box',
              id: 'list_id_' + field.fieldName,
            },
            showClearButton: true,
            onValueChanged: function (e) {
              scope.adpFormData[field.fieldName] = e.value;
            },
            dataSource: listOfOptions,
            onInitialized: function (e) {
              scope.boxInstance = e.component;
            }
          }
        }

        function defineDirectiveType(field) {
          if (isMultiple(field)) {
            return 'dx-tag-box';
          } else {
            return 'dx-select-box';
          }
        }

        function isMultiple(field) {
          return field.type.includes('[]');
        }

        function bindWatcher(field, listOfOptions) {
          scope.$watch(function () {
            return scope.isRequired();
          }, function (newVal) {
            if (newVal && listOfOptions.length === 1) {
              var valueToAssign = isMultiple(field) ?
                [listOfOptions[0].value] :
                listOfOptions[0].value;

              scope.boxInstance.option('value', valueToAssign);
            }
          });
        }
      }
    }
  }
})();
