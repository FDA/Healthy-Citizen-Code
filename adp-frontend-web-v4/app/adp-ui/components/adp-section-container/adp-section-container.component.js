;(function () {
  'use strict';

  var componentDefinition = {
    templateUrl: 'app/adp-ui/components/adp-section-container/adp-section-container.template.html',
    transclude: true
  };

  angular.module('app.adpUi')
    .component('adpSectionContainer', componentDefinition);
})();