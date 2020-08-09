;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldDate', adpFormFieldDate);

  function adpFormFieldDate() {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-date/adp-form-field-date.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.field = scope.adpField;
        scope.adpFormData[scope.field.keyName] = scope.adpFormData[scope.field.keyName] || '';
        scope.datepickerModel = '';
        scope.form = formCtrl;
        scope.uiProps = scope.adpFieldUiProps;

        scope.dropDownClass = 'dropdown-toggle-' + scope.$id;
        scope.status = {
          isOpen: false
        };

        scope.datepickerOptions = {
          startView: startView(scope.field),
          minView: endView(scope.field)
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
      }
    }
  }
})();
