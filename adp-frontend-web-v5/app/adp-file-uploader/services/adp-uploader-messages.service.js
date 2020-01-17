;(function () {
  'use strict';

  angular
    .module('app.adpUploader')
    .factory('AdpUploaderMessages', AdpUploaderMessages);

  /** @ngInject */
  function AdpUploaderMessages(AdpNotificationService) {
    var MESSAGES = {
      'folder': function () {
        return 'Folder upload is not allowed.';
      },
      'queueLimit': function (options) {
        return ['Maximum files amount is exceeded. Maximum files amount is ', options.fileLimit || 1, '.'].join(' ');
      },
      'maxFileSize': function (options) {
        return ['File is too big. Maximum files size is ', _bytesToSize(options.maxFileSize), '.'].join(' ');
      },
      'mimeType': function () {
        return 'File type is not supported.'
      },
      'duplicates': function () {
        return 'Files is already added.'
      },
      'dimension': function (options) {
        var sizesMessage = getDimensionMessageSizes(options);
        return 'Image must be ' + sizesMessage + '.'
      }
    };

    var dimensions = {
      'minWidth': function (options) {
        return options.minWidth ? 'no less than ' + options.minWidth + 'px wide' : '';
      },
      'maxWidth': function (options) {
        return options.maxWidth ? 'no more than ' + options.maxWidth + 'px wide' : '';
      },
      'minHeight': function (options) {
        return options.minHeight ? 'no less than ' + options.minWidth + 'px tall' : '';
      },
      'maxHeight': function (options) {
        return options.maxHeight ? 'no more than ' + options.maxHeight + 'px tall' : '';
      }
    };

    function getDimensionMessageSizes(options) {
      return _.map(dimensions, function (messageFn) {
        return messageFn(options);
      }).join(', ');
    }

    function _bytesToSize(bytes) {
      var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      if (bytes == 0) return '0 Byte';
      var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
      return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }

    function addError(item, filter, uploader) {
      if (!uploader.errors) {
        uploader.errors = [];
      }

      uploader.errors.push({
        file: item.name,
        message: MESSAGES[filter.name](uploader.getOptions())
      });
    }

    function getMessage(name, options) {
      return MESSAGES[name](options)
    }

    function showErrorMessage(name, uploader) {
      var message = getMessage(name, uploader.getOptions());
      return AdpNotificationService.notifyError(message);
    }

    return {
      addError: addError,
      getMessage: getMessage,
      showErrorMessage: showErrorMessage
    }
  }
})();
