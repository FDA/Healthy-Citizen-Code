;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('dateControl', dateControl);

  function dateControl(AdpValidationService) {
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
        scope.adpFormData[scope.field.keyName] = scope.adpFormData[scope.field.keyName] || '';
        scope.form = formCtrl;

        scope.dropDownClass = 'dropdown-toggle-' + scope.$id;
        scope.status = {
          isOpen: false
        };

        scope.datepickerOptions = {
          startView: startView(scope.field),
          minView: endView(scope.field)
        };

        scope.onDateChange = function() {
          // WORAROUND: datepicker is not setting related inputs dirty on change
          scope.form[scope.field.keyName].$setDirty();
        };

        scope.disableFutureDates = function ($dates) {
          if (!hasMaxDate(scope.field)) return;

          var todaySinceMidnight = new Date();
          todaySinceMidnight.setUTCHours(0,0,0,0);

          $dates.filter(function (date) {
            return date.utcDateValue > todaySinceMidnight.getTime();
          }).forEach(function (date) {
            date.selectable = false;
          });
        };

        scope.closeDropDown = function () {
          scope.status.isOpen = false;
        };

        function startView(field) {
          var subtype = field.subtype;

          var modes = {
            'Date': 'day',
            'DateTime': 'day',
            'Time': 'hour'
          };

          return modes[subtype] || modes['Date'];
        }

        function endView(field) {
          var subtype = field.subtype;

          var modes = {
            'Date': 'day',
            'DateTime': 'minute',
            'Time': 'minute'
          };

          return modes[subtype] || modes['Date'];
        }

        function hasMaxDate(field) {
          return _.find(field.validate, function (validator) {
            return validator.validator === 'notInFuture';
          });
        }

        scope.isRequired = AdpValidationService.isRequired(scope.validationParams);
      }
    }
  }
})();
