;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpDateFormatter', function(
      AdpValidationService
    ) {
      return {
        require: 'ngModel',
        scope: {
          adpDateFormatter: '='
        },
        link: function(scope, element, attrs, ngModel) {
          var subtype = scope.adpDateFormatter;
          var dateFormat = AdpValidationService.getDateFormat(subtype);
          ngModel.$formatters.push(function(date) {
            return date ? moment(date).format(dateFormat) : '';
          });

          ngModel.$parsers.push(function(dateString) {
            if (dateString === '') {
              return dateString;
            }
            var d = moment(dateString, dateFormat, true);
            return d.toDate();
          });

          // what is happening here is that
          // when datepicker plugins is initialized
          // iso date is set as viewValue
          // so we need to validate date using two date formats
          ngModel.$validators.dateValid = function (viewValue) {
            if (!viewValue) return true;

            return AdpValidationService.isValidDate(viewValue, subtype);
          }
        }
      };
    });
})();