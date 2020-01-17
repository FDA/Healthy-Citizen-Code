;(function() {
  'use strict';

  angular
    .module('app.adpGenerator')
    .factory('AdpModalService', AdpModalService);

  /** @ngInject */
  function AdpModalService($uibModal, AdpFullscreenService) {
    return {
      confirm: confirm,
      prompt: prompt,
      createModal: createModal,
      passwordUpdate: passwordUpdate,
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

    // Available options
    // options = {
    //   title: String,          - dialog title
    //   value: any,             - initial value, default is empty
    //   validate: Function      - value => wrong_value ? 'error message' : ''
    //   saveButtonText: String  - default is 'Save'
    // }
    function prompt(options) {
      return createModal('adpPromptDialogModal',
        _.extend({actionType: 'prompt'}, options || {})
      ).result;
    }

    function passwordUpdate(field) {
      var modalOptions = {
        actionType: 'passwordUpdate',
        field: field,
      };

      return createModal('adpPasswordModal', modalOptions)
        .result;
    }

    function createModal(componentName, options) {
      var modalInstance = $uibModal.open({
        backdrop: 'static',
        size: options.sizeSmall ? 'sm' : 'lg',
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
