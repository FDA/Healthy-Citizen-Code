;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpDateFormatter', function(AdpValidationUtils) {
      return {
        require: 'ngModel',
        scope: {
          adpDateFormatter: '='
        },
        link: function(scope, element, attrs, ngModel) {
          var type = scope.adpDateFormatter;
          var dateFormat = AdpValidationUtils.getDateFormat(type);

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

            return AdpValidationUtils.isValidDate(viewValue, type);
          }
        }
      };
    });
})();
