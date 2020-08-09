;(function () {
  'use strict';

  var componentDefinition = {
    templateUrl: 'app/hc-ui/components/hc-content-container/hc-content-container.template.html',
    bindings: {
      loading: '<'
    },
    transclude: true
  };

  angular.module('app.hcUi')
    .component('hcContentContainer', componentDefinition);
})();