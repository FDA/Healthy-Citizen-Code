(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('imperialUnitsControl', imperialUnitsControl);

  function imperialUnitsControl(
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
      templateUrl: 'app/adp-forms/directives/adp-form-controls/imperial-units-control/imperial-units-control.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.form = formCtrl;
        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);

        function init() {
          scope.units = AdpFieldsService.getUnits(scope.field);

          initModelValue();
          createViewValue();
          setOptions();
          addWatchers();
        }
        init();

        function getFieldData() {
          return scope.adpFormData[scope.field.fieldName];
        }

        function setFieldData(value) {
          if (_.isEmpty(_.compact(value))) {
            scope.adpFormData[scope.field.fieldName] = null;
          } else {
            scope.adpFormData[scope.field.fieldName] = value;
          }
        }

        function createViewValue() {
          var fieldData = getFieldData() || [0, 0];
          scope.viewValue = {};
          scope.ranges = {};

          _.each(scope.units, function(unit, index) {
            var unitRange = _.range.apply(this, unit.range);
            scope.viewValue[unit.name] = fieldData[index];

            scope.ranges[unit.name] = _.map(unitRange, function (i) {
              return { value: i, label: i + unit.label };
            });
          })
        }

        function initModelValue() {
          var fieldData = getFieldData();

          if (_.isNumber(fieldData)) {
            fieldData = [fieldData];
          }

          if (_.isEmpty(fieldData)) {
            fieldData = scope.units.map(function() {
              return 0;
            });
          }

          setFieldData(fieldData);
        }

        function setOptions() {
          // hiding search input
          // https://github.com/select2/select2/issues/489#issuecomment-100602293
          scope.options = {
            minimumResultsForSearch: -1
          };
        }

        function addWatchers() {
          scope.$watchGroup(createWatcherCondition(), function () {
            setFieldData(_.map(scope.viewValue, parseInt));
          });
        }

        function createWatcherCondition() {
          return _.map(scope.units, function(unit) {
            return ['viewValue', unit.name].join('.');
          });
        }

        scope.validate = function () {
          scope.form[scope.field.fieldName].$setDirty();
          scope.form[scope.field.fieldName].$validate();
        };
      }
    }
  }
})();
