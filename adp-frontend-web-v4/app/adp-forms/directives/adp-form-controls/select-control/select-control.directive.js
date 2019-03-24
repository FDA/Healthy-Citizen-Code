(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('selectControl', selectControl);

  function selectControl(
    AdpFieldsService,
    AdpValidationService
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        fieldUiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/select-control/select-control.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        var initialValue = isEmpty() ? null : getData().toString();
        setData(initialValue);

        scope.form = formCtrl;
        scope.uiProps = scope.adpFieldUiProps;

        scope.listOfOptions = AdpFieldsService.getListOfOptions(scope.field.list);

        scope.options = {
          allowClear: true,
          formatResult: function (state) {
            return state.text;
          },
          formatSelection: function (state) {
            return state.text;
          }
        };

        // hiding search input
        // https://github.com/select2/select2/issues/489#issuecomment-100602293
        if (scope.listOfOptions.length < 10) {
          scope.options.minimumResultsForSearch = -1;
        }

        scope.isRequired = AdpValidationService.isRequired(scope.validationParams);

        function isEmpty() {
          var data = getData();
          return _.isUndefined(data) || _.isNull(data);
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
