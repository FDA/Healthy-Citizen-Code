;(function () {
  'use strict';

  angular
    .module('app.hcForms')
    .directive('hcListFormatter', function() {
      return {
        require: 'ngModel',
        link: function(scope, element, attrs, ngModel) {
          ngModel.$parsers.push(function(value) {
            return !!value ? value.split(',') : [];
          });
        }
      };
    });
})();