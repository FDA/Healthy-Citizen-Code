;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('dateControl', dateControl);

  function dateControl(AdpValidationUtils) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/date-control/date-control.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.adpFormData[scope.field.fieldName] = scope.adpFormData[scope.field.fieldName] || '';
        scope.form = formCtrl;

        scope.dropDownClass = 'dropdown-toggle-' + scope.$id;
        scope.status = {
          isOpen: false
        };

        scope.datepickerOptions = {
          startView: startView(scope.field),
          minView: endView(scope.field)
        };

        scope.placeholder = getPlaceholder(scope.field);

        scope.onDateChange = function() {
          // WORAROUND: datepicker is not setting related inputs dirty on change
          scope.form[scope.field.fieldName].$setDirty();
        };

        scope.beforeRender = function (dates) {
          if (hasMaxDate(scope.field)) {
            disableDates(dates, function (date, today) {
              return date > today;
            });
          }

          if (hasMinDate(scope.field)) {
            disableDates(dates, function (date, today) {
              return date < today;
            });
          }
        }

        scope.closeDropDown = function () {
          scope.status.isOpen = false;
        };

        function disableDates(dates, cmp) {
          var todaySinceMidnight = new Date();
          todaySinceMidnight.setHours(0,0,0,0);

          dates.filter(function (date) {
            return cmp(date.localDateValue(), todaySinceMidnight.getTime());
          }).forEach(function (date) {
            date.selectable = false;
          });
        }

        function startView(field) {
          var modes = {
            'Date': 'day',
            'DateTime': 'day',
            'Time': 'hour'
          };

          return modes[field.type] || modes['Date'];
        }

        function endView(field) {
          var modes = {
            'Date': 'day',
            'DateTime': 'minute',
            'Time': 'minute'
          };

          return modes[field.type] || modes['Date'];
        }

        function getPlaceholder(field) {
          var modes = {
            'Date': 'Enter date',
            'DateTime': 'Enter date & time',
            'Time': 'Enter time'
          };

          return modes[field.type] || modes['Date'];
        }

        function hasMaxDate(field) {
          return _.find(field.validate, function (validator) {
            return validator.validator === 'notInFuture';
          });
        }

        function hasMinDate(field) {
          return _.find(field.validate, function (validator) {
            return validator.validator === 'notInPast';
          });
        }

        scope.isRequired = AdpValidationUtils.isRequired(scope.validationParams.formParams);
      }
    }
  }
})();
