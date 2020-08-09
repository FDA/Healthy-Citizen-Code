;(function () {
  'use strict';

  var componentDefinition = {
    templateUrl: 'app/adp-ui/components/adp-content-container/adp-content-container.template.html',
    bindings: {
      loading: '<'
    },
    transclude: true
  };

  angular.module('app.adpUi')
    .component('adpContentContainer', componentDefinition);
})();