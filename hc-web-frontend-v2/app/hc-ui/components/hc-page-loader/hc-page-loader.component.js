;(function () {
  'use strict';

  var componentDefinition = {
    templateUrl: 'app/hc-ui/components/hc-page-loader/hc-page-loader.template.html',
    bindings: {
      loading: '<'
    }
  };

  angular.module('app.hcUi')
    .component('hcPageLoader', componentDefinition);
})();