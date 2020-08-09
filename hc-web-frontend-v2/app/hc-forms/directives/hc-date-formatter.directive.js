;(function () {
  'use strict';

  angular
    .module('app.hcForms')
    .directive('hcDateFormatter', function(DATE_FORMAT) {
      return {
        require: 'ngModel',
        link: function(scope, element, attrs, ngModel) {
          ngModel.$formatters.push(function(date) {
            return date ? moment(date).format(DATE_FORMAT) : '';
          });

          ngModel.$parsers.push(function(dateString) {
            var d = moment(dateString, DATE_FORMAT, true);
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
              DATE_FORMAT
            ];

            var d = moment(viewValue, formats, true);
            return d.isValid();
          }
        }
      };
    });
})();