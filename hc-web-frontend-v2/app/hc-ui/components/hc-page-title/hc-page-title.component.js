;(function () {
  'use strict';

  var componentDefinition = {
    templateUrl: 'app/hc-ui/components/hc-page-title/hc-page-title.template.html',
    bindings: {
      loading: '<'
    },
    transclude: true
  };

  angular.module('app.hcUi')
    .component('hcPageTitle', componentDefinition);
})();
