;(function () {
  'use strict';

  angular.module('app.adpUi')
    .directive('adpSelect2', adpSelect2);

  // temp fix: http://plnkr.co/edit/zkcnW2?p=info
  function adpSelect2($timeout, $compile) {
    return {
      restrict: 'A',
      scope: {
        options: '='
      },
      link: function (scope, element, attrs) {
        var options = scope.options || {};
        $timeout(createSelect);
        scope.$watch(attrs.ngModel, refreshSelect);

        if(attrs.ngOptions) {
          var list = attrs.ngOptions.match(/ in ([^ ]*)/)[1];
          // watch for option list change
          // scope.$watch(list, recreateSelect);
        }

        if(attrs.ngDisabled) {
          scope.$watch(attrs.ngDisabled, refreshSelect);
        }

        scope.$on('$destroy', destroy);

        function createSelect() {
          element.select2(options);

          if (options.onChange) {
            element.on('change', options.onChange);
          }

          element.select2Initialized = true;
        }

        function refreshSelect() {
          if(!element.select2Initialized) return;

          $timeout(function () {
            element.trigger('change');
          });
        }

        function recreateSelect() {
          if(!element.select2Initialized) return;

          $timeout(function () {
            element.select2('destroy');
            element.select2(options);
          });
        }

        // TODO: add working destroy
        function destroy() {
          element.select2('close');
          element.select2('destroy');
        }
      }
    }
  }
})();