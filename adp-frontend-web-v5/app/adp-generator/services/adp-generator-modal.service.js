;(function() {
  'use strict';

  angular
    .module('app.adpGenerator')
    .factory('AdpGeneratorModalService', AdpGeneratorModalService);

  /** @ngInject */
  function AdpGeneratorModalService(AdpModalService) {
    return {
      formModal: formModal,
      formNestedModal: formNestedModal,
      detailsModal: detailsModal,
      defaultActionModal: defaultActionModal
    };

    // Available options
    // options = {
    //   actionTypes: 'create' || 'update',
    //   fields: fields,
    //   data: data,
    //   link: link
    // }
    function formModal(options) {
      var modalInstance = AdpModalService.createModal('adpRecordFormModal', options);

      return modalInstance.result;
    }

    // Available options
    // options = {
    //   actionTypes: 'create' || 'update',
    //   fields: fields,
    //   data: data,
    //   link: link
    // }
    function formNestedModal(options) {
      var modalInstance = AdpModalService.createModal(
        'adpRecordNestedFormModal',
        _.extend({actionType: 'form'}, options)
      );

      return modalInstance.result;
    }

    // Available options
    // options = {
    //   actionTypes: String,
    //    schema: {}
    //    itemData: {}
    // }
    function detailsModal(options) {
      var modalInstance = AdpModalService.createModal(
        'adpRecordDetailsModal',
        _.extend({actionType: 'view-details'}, options)
      );

      return modalInstance.result;
    }

    function defaultActionModal(options) {
      var modalInstance = AdpModalService.createModal(
        'adpDefaultActionModal',
        _.extend({actionType: 'default-action'}, options)
      );

      return modalInstance.result;
    }
  }
})();
