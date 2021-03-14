;(function () {
  "use strict";

  angular
    .module("app.adpGenerator")
    .factory("AdpModalService", AdpModalService);

  /** @ngInject */
  function AdpModalService($uibModal) {
    return {
      confirm: confirm,
      prompt: prompt,
      readFile: readFile,
      createModal: createModal,
      passwordUpdate: passwordUpdate,
      alert: alert,
    };

    // Available options
    // options = {
    //   message: 'string',
    //   actionType: String
    // }
    function confirm(options) {
      return createModal(
        "adpConfirmDialogModal",
        _.extend({ actionType: "confirm" }, options)
      ).result;
    }

    // Available options
    // options = {
    //   title: String,          - dialog title
    //   value: any,             - initial value, default is empty
    //   isRequired: true        - set to false if you allow to 'Save' with empty value
    //   validate: Function      - value => wrong_value ? 'error message' : ''
    //   saveButtonText: String  - default is 'Save'
    // }
    function prompt(options) {
      return createModal("adpPromptDialogModal",
        _.extend({actionType: "prompt"}, options || {})
      ).result;
    }

    // Available options
    // options = {
    //  title: String,          - dialog title
    //  validate: Function      - file => return error msg if file is not ok, empty string for success
    //                               (!!! validation if file is chosen provided internally )
    //  uploadButtonText: String  - default is 'Upload'
    //  outputFormat: [ text (default) | arrayBuffer | binaryString | dataURL ]
    //                               heck for details: https://developer.mozilla.org/ru/docs/Web/API/FileReader#Methods
    //  autoOpenFileDialog: true  - opens 'file open' dialog automatically
    //  readFile: true           - set to false and prompt will return file without reading its contents (useful for server-uploading)
    //  }
    function readFile(options) {
      return createModal("adpReadFileDialogModal",
        _.extend({actionType: "readFile"}, options || {})
      ).result;
    }

    function passwordUpdate(args) {
      var modalOptions = {
        actionType: "passwordUpdate",
        args: args,
      };

      return createModal("adpPasswordModal", modalOptions)
        .result;
    }

    // Available options
    // options = {
    //   message: 'string',
    // }
    function alert(options) {
      return createModal(
        "adpAlertModal",
        _.extend({ actionType: "alert" }, options)
      ).result;
    }

    function createModal(componentName, options) {
      var modalInstance = $uibModal.open({
        backdrop: "static",
        size: options.sizeSmall ? "sm" : "lg",
        component: componentName,
        backdropClass: options.backdropClass || '',
        windowClass: options.windowClass || '',
        keyboard: false,
        resolve: {
          options: function () {
            return options;
          },
        },
      });

      _addActionClass(options);
      _handleOnClose(modalInstance);

      return modalInstance;
    }

    function _handleOnClose(modalInstance) {
      modalInstance.closed
        .then(_removeActionClass);
    }

    function _addActionClass(options) {
      $("body").addClass("page-action-" + options.actionType);
    }

    function _removeActionClass(result) {
      var regex = /(^|\s)page-action-\S+/g;

      $("body").removeClass(function (index, className) {
        return (className.match(regex) || []).join(" ").trim();
      });

      return result || "EMPTY_RESULT";
    }
  }
})();
