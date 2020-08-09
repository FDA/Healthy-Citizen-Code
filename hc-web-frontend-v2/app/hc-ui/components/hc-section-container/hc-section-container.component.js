;(function () {
  'use strict';

  var componentDefinition = {
    templateUrl: 'app/hc-ui/components/hc-section-container/hc-section-container.template.html',
    transclude: true
  };

  angular.module('app.hcUi')
    .component('hcSectionContainer', componentDefinition);
})();