;(function () {
  'use strict';

  var componentDefinition = {
    templateUrl: 'app/adp-ui/components/adp-page-loader/adp-page-loader.template.html',
    bindings: {
      loading: '<'
    }
  };

  angular.module('app.adpUi')
    .component('adpPageLoader', componentDefinition);
})();