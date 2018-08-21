;(function () {
  'use strict';

  var componentDefinition = {
    templateUrl: 'app/adp-ui/components/adp-section-title/adp-section-title.template.html',
    bindings: {
      loading: '<'
    },
    transclude: true
  };

  angular.module('app.adpUi')
    .component('adpSectionTitle', componentDefinition);
})();
