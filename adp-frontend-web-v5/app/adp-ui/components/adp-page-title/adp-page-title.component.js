;(function () {
  'use strict';

  var componentDefinition = {
    templateUrl: 'app/adp-ui/components/adp-page-title/adp-page-title.template.html',
    bindings: {
      loading: '<'
    },
    transclude: true
  };

  angular.module('app.adpUi')
    .component('adpPageTitle', componentDefinition);
})();
