(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('treeSelectorRequired', treeSelectorRequired);

  function treeSelectorRequired() {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function (scope, el, attrs, ctrl) {
        var isRequired = false;
        addValidator();

        scope.$watch(attrs.treeSelectorRequired, function(newStatus) {
          isRequired = newStatus;
          ctrl.$validate();
        });

        function addValidator() {
          ctrl.$validators.required = function(modelValue) {
            if (isRequired === false) {
              return true;
            }

            return !_.isEmpty(_.last(modelValue));
          };
        }
      }
    }
  }
})();
