;(function() {
  'use strict';

  angular
    .module('app.hcGenerator')
    .factory('HcModalService', HcModalService);

  /** @ngInject */
  function HcModalService($uibModal) {
    return {
      confirm: confirm
    };

    // Available options
    // options = {
    //   message: 'string'
    // }
    function confirm(options) {
      return $uibModal.open({
        backdrop: 'static',
        component: 'hcConfirmDialogModal',
        resolve: {
          options: function () {
            return options;
          }
        }
      }).result;
    }
  }
})();
