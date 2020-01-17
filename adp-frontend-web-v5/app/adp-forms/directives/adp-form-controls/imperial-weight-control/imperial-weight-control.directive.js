(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('imperialWeightControl', imperialWeightControl);

  function imperialWeightControl(
    AdpValidationUtils,
    AdpFieldsService
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/imperial-weight-control/imperial-weight-control.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.form = formCtrl;
        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);

        (function init() {
          var initialValue = isEmpty() ? null : getData().toString();
          setData(initialValue);

          createRangesList();
          setOptions();
        })();

        function createRangesList() {
          var weigthUnit = AdpFieldsService.getUnits(scope.field)[0];
          var unitRange = _.range.apply(this, weigthUnit.range);

          scope.rangeList = _.map(unitRange, function (i) {
            return { value: i, label: i + weigthUnit.label };
          });
        }

        function setOptions() {
          // hiding search input
          // https://github.com/select2/select2/issues/489#issuecomment-100602293
          scope.options = {
            minimumResultsForSearch: -1,
            onChange: function(e) {
              scope.adpFormData[scope.field.fieldName] = parseInt(e.added.id, 10);
            },
            formatResult: function (state) {
              return state.text;
            },
            formatSelection: function (state) {
              return state.text;
            }
          };
        }

        function isEmpty() {
          var data = getData();
          return _.isUndefined(data) || _.isNull(data);
        }

        function getData() {
          return scope.adpFormData[scope.field.fieldName];
        }

        function setData(value) {
          return scope.adpFormData[scope.field.fieldName] = value;
        }
      }
    }
  }
})();
