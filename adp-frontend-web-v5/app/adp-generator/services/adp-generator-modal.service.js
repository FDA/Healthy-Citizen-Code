;(function() {
  'use strict';

  angular
    .module('app.adpGenerator')
    .factory('AdpGeneratorModalService', AdpGeneratorModalService);

  /** @ngInject */
  function AdpGeneratorModalService(AdpModalService, $timeout) {
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
      var schemaName =  _.get(options, 'args.modelSchema.schemaName', null);
      var loaderId = schemaName ? 'loader-for-form-' + schemaName : null;
      showLoader(loaderId);

      return $timeout(function() {
        return AdpModalService.createModal('adpRecordFormModal', options);
      }, 30).then(function (modalInstance) {
        modalInstance.rendered.then(function() {
          hideLoader(loaderId);
        });

        return modalInstance.result;
      });
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

    function showLoader(loaderId) {
      if (!loaderId) {
        return;
      }

      var backdrop = $('<div class="loader-overlay" modal-loader-id="' + loaderId + '">');

      var loader = $('</div><div class="fa fa-gear fa-spin fa-5x">');
      loader.css({
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      });

      backdrop.append(loader)
      $(document.body).prepend(backdrop);
    }

    function hideLoader(loaderId) {
      if (!loaderId) {
        return;
      }

      var loader = document.querySelector('[modal-loader-id="' + loaderId + '"]');
      loader && $(loader).remove();
    }
  }
})();
