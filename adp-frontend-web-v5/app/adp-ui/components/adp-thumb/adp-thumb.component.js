;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .component('adpThumb', {
      templateUrl: 'app/adp-ui/components/adp-thumb/adp-thumb.template.html',
      bindings: {
        fileItem: '<'
      },
      controller: 'AdpThumbController',
      controllerAs: 'vm'
    });
})();