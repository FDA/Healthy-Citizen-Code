;(function () {
  'use strict';

  var componentDefinition = {
    templateUrl: 'app/hc-ui/components/hc-section-title/hc-section-title.template.html',
    bindings: {
      loading: '<'
    },
    transclude: true
  };

  angular.module('app.hcUi')
    .component('hcSectionTitle', componentDefinition);
})();
