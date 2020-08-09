;(function() {
  'use strict';

  angular
    .module('app.adpUi')
    .directive('adpAccordion', function ($timeout) {
    return {
      restrict: 'A',
      scope: {
        adpAccordionOptions: '='
      },
      link: function (scope, element) {
        var defaults = {
          header: '.adp-form-group-head',
          icons: {
            header: "fa fa-plus",
            activeHeader: "fa fa-minus"
          },
          animate : 300,
          fillSpace: false,
          collapsible: false,
          heightStyle: 'auto',
          multiple: false
        };

        $timeout(function() {
          var options = _.merge(defaults, scope.adpAccordionOptions);
          element.accordion(options);
        });
      }
    }
  });

})();