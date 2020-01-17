;(function () {
  'use strict';

  angular
    .module('app.adpUploader')
    .factory('AdpFileUploaderService', AdpFileUploaderService);

  /** @ngInject */
  function AdpFileUploaderService(
    AdpSessionService,
    FileUploader,
    adpFileUploaderOptions,
    AdpUploaderMessages,
    AdpUploaderDimensionFilter,
    AdpFileUploaderModalService,
    AdpUploaderFilters,
    AdpMimeService,
    APP_CONFIG,
    Guid,
    $q
  ){
    function create(field, uploadedFiles) {
      var defaults = _getDefaults(field, adpFileUploaderOptions);
      var options = _.defaultsDeep(field['arguments'], defaults);

      var uploader = new FileUploader({
        url: APP_CONFIG.apiUrl + '/upload',
        queueLimit: options.multiple ? (options.fileLimit || 5) : 1,
        headers: {
          'Authorization': AdpSessionService.getAuthHeaders()
        }
      });
      options.fileLimit = uploader.queueLimit;
      uploader.adpField = field;

      if (!_.isEmpty(uploadedFiles)) {
        _addUploadedFilesToQueue(uploader, uploadedFiles);
      }

      _addMethods(uploader, options);
      _addCustomFilters(uploader, options);
      _bindEvents(uploader, options);

      return uploader;
    }

    function _getDefaults(field, defaults) {
      var fieldType = field.type.toLowerCase().replace('[]', '');
      return defaults[fieldType];
    }

    function _addUploadedFilesToQueue(uploader, files) {
      // WORKAROUND: server can't complex objects
      files.forEach(function(fileObject) {
        var dummyFile = _createDummyFile(fileObject, uploader);
        uploader.queue.push(dummyFile);
      });
    }

    function _createDummyFile(file, uploader) {
      var dummy = new FileUploader.FileItem(uploader, {
        lastModifiedDate: new Date(),
        size: 1e6,
        type: file.type,
        name: file.name,
        id: file.id,
        cropped: file.cropped,
        isDummyFile: true
      });

      dummy.progress = 100;
      dummy.isUploaded = true;
      dummy.isSuccess = true;

      return dummy;
    }

    function _addMethods(uploader, options) {
      uploader.clearErrors = function () {
        this.errors = [];
      };

      uploader.addFiles = function (files) {
        this.clearErrors();
        this.addToQueue(files, options, this.filters);

        uploader.queue.forEach(function (file) {
          file._file.id = Guid.create();
        });
      };

      uploader.getOptions = function () {
        return options;
      };

      uploader.callAddFileWindows = _addFile.bind(uploader);
    }

    function _addCustomFilters(uploader) {
      var filterNames = AdpUploaderFilters.getCustomList();
      var filters = AdpUploaderFilters.filters();

      _.each(filterNames, function (filterName) {
        uploader.filters.push(filters[filterName]);
      });
    }

    function _bindEvents(uploader, options) {
      uploader.onWhenAddingFileFailed = function (item, filter) {
        AdpUploaderMessages.addError(item, filter, uploader);
      };

      uploader.onAfterAddingAll = function () {
        var enableCropPromise = options.enableCropper ? enableCrop : $q.when;

        AdpUploaderDimensionFilter.filter(uploader)
          .then(enableCropPromise);
      };

      uploader.onErrorItem = function(item, response, status) {
        var sessionExpired = status === 401 && !lsService.isGuest();

        if (sessionExpired) {
          AdpSessionService.handleUnauthorized();
        }
      }
    }

    function enableCrop(uploader) {
      var items = uploader.queue;
      var imagesOnly = _.filter(items, function (item) {
        return AdpMimeService.isImage(item.file.name);
      });

      return imagesOnly.length > 0 ? AdpFileUploaderModalService.cropModal(imagesOnly) : $q.when();
    }

    function _addFile() {
      var options = this.getOptions();
      var uploader = this;

      if (isFileAmountLimit(uploader)) {
        return AdpUploaderMessages.showErrorMessage('queueLimit', uploader);
      }

      var input = $('<input type="file">');
      input[0].multiple = options.multiple;
      input.click();

      $(input).on('change.adpTempUpload', function (e) {
        uploader.addFiles(e.target.files);
        input.off('change.adpTempUpload');
      });
    }

    function isFileAmountLimit(uploader) {
      return uploader.queue.length >= uploader.queueLimit;
    }

    return {
      create: create,
      isFileAmountLimit: isFileAmountLimit
    };
  }
})();
