;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpDateFormatter', function(
      DATE_FORMAT,
      DATE_TIME_FORMAT,
      TIME_FORMAT
    ) {
      return {
        require: 'ngModel',
        scope: {
          adpDateFormatter: '='
        },
        link: function(scope, element, attrs, ngModel) {
          var dateFormat = getDateFormat(scope.adpDateFormatter);

          function getDateFormat(dateFormat) {
            var dateFormats = {
              'Date': DATE_FORMAT,
              'DateTime': DATE_TIME_FORMAT,
              'Time': TIME_FORMAT
            };

            return dateFormats[dateFormat] || dateFormats['Date'];
          }

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

            var formats = [
              moment.ISO_8601,
              dateFormat
            ];

            var d = moment(viewValue, formats, true);
            return d.isValid();
          }
        }
      };
    });
})();