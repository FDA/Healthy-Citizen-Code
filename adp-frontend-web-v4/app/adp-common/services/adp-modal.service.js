;(function() {
  'use strict';

  angular
    .module('app.adpGenerator')
    .factory('AdpModalService', AdpModalService);

  /** @ngInject */
  function AdpModalService($uibModal, AdpFullscreenService) {
    return {
      confirm: confirm,
      createModal: createModal
    };

    // Available options
    // options = {
    //   message: 'string',
    //   actionType: String
    // }
    function confirm(options) {
      return createModal(
        'adpConfirmDialogModal',
        _.extend({actionType: 'confirm'}, options)
      ).result;
    }

    function createModal(componentName, options) {
      var modalInstance = $uibModal.open({
        backdrop: 'static',
        size: 'lg',
        component: componentName,
        resolve: {
          options: function() {
            return options;
          }
        }
      });
      _addActionClass(options);
      _handleOnClose(modalInstance);

      return modalInstance;
    }

    function _handleOnClose(modalInstance) {
      modalInstance.closed
        .then(_disableFullscreen)
        .then(_removeActionClass);
    }

    function _addActionClass(options) {
      $('body').addClass('page-action-' + options.actionType);
    }

    function _removeActionClass(result) {
      var regex = /(^|\s)page-action-\S+/g;

      $('body').removeClass(function(index, className) {
        return (className.match(regex) || []).join(' ').trim();
      });

      return result || 'EMPTY_RESULT';
    }

    function _disableFullscreen(result) {
      if (AdpFullscreenService.fullscreenEnabled()) {
        AdpFullscreenService.exitFullscreen();
      }

      return result || 'EMPTY_RESULT';
    }
  }
})();
