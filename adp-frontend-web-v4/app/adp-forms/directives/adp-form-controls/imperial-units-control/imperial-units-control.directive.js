(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('imperialUnitsControl', imperialUnitsControl);

  function imperialUnitsControl(AdpFieldsService) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/imperial-units-control/imperial-units-control.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.form = formCtrl;

        function init() {
          scope.units = AdpFieldsService.getUnits(scope.field.subtype);
          removeLimitValidator();
          initModelValue();
          createViewValue();
          setOptions();
          addWatchers();
        }
        init();

        function getFieldData() {
          return scope.adpFormData[scope.field.keyName];
        }

        function setFieldData(value) {
          scope.adpFormData[scope.field.keyName] = value;
        }

        function removeLimitValidator() {
          // remove validator, which is not requried by web client
          var toRemove = ['min', 'max'];

          _.remove(scope.field.validate, function (validator) {
            return toRemove.indexOf(validator.validator) > -1;
          });
        }

        function createViewValue() {
          var fieldData = getFieldData();
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
          scope.form[scope.field.keyName].$setDirty();
          scope.form[scope.field.keyName].$validate();
        };
      }
    }
  }
})();
