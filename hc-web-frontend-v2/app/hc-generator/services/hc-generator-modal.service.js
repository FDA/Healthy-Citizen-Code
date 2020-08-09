;(function() {
  'use strict';

  angular
    .module('app.hcGenerator')
    .factory('HcGeneratorModalService', HcGeneratorModalService);

  /** @ngInject */
  function HcGeneratorModalService($uibModal) {
    return {
      formModal: formModal,
      formNestedModal: formNestedModal
    };

    // Available options
    // options = {
    //   actionTypes: 'create' || 'update',
    //   fields: fields,
    //   data: data,
    //   link: link
    // }
    function formModal(options) {
      return $uibModal.open({
        backdrop: 'static',
        component: 'hcRecordFormModal',
        resolve: {
          options: function () {
            return options;
          }
        }
      }).result;
    }

    // Available options
    // options = {
    //   actionTypes: 'create' || 'update',
    //   fields: fields,
    //   data: data,
    //   link: link
    // }
    function formNestedModal(options) {
      return $uibModal.open({
        backdrop: 'static',
        component: 'hcRecordNestedFormModal',
        resolve: {
          options: function () {
            return options;
          }
        }
      }).result;
    }
  }
})();
