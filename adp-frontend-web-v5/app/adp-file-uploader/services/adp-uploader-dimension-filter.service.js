;(function () {
  'use strict';

  angular
    .module('app.adpUploader')
    .factory('AdpUploaderDimensionFilter', AdpUploaderDimensionFilter);

  /** @ngInject */
  function AdpUploaderDimensionFilter(
    AdpUploaderMessages,
    AdpMimeService,
    $q
  ) {
    function filter(uploader) {
      var hasFilter = _hasDimensionFilter(uploader.getOptions());

      var imagesOnly = _.filter(uploader.queue, function (item) {
        return AdpMimeService.isImage(item.file.name) && !item.isUploaded;
      });

      if (!imagesOnly.length || !hasFilter) return $q.when(uploader);

      return $q.all(imagesOnly.map(_getDimension))
        .then(function (itemParams) {
          _filterByDimension(itemParams, uploader);
          return uploader;
        })
    }

    function _filterByDimension(itemsParams, uploader) {
      var options = uploader.getOptions();

      _.each(itemsParams, function (params) {
        if (params.message === 'NOT_AN_IMAGE') return;
        var doRemove = false;

        if (options.minWidth && params.w < options.minWidth) {
          doRemove = true;
        }

        if (options.maxWidth && params.w > options.maxWidth) {
          doRemove = true;
        }

        if (options.minHeight && params.h < options.minHeight) {
          doRemove = true;
        }

        if (options.maxHeight && params.h > options.maxHeight) {
          doRemove = true;
        }

        if (doRemove) {
          params.item.remove();
          AdpUploaderMessages.addError(params.item.file, {name: 'dimension'}, uploader)
        }
      });
    }

    function _getDimensionFilters() {
      return ['minWidth', 'maxWidth', 'minHeight', 'maxHeight'];
    }

    function _getDimension(item) {
      return $q(function (resolve, reject) {
        var img = new Image();

        img.src = URL.createObjectURL(item._file);

        img.onload = function() {
          var width = img.naturalWidth,
            height = img.naturalHeight;

          window.URL.revokeObjectURL(img.src);
          if (width && height) {
            resolve({item: item, w: width, h: height });
          } else {
            resolve({message: 'NOT_AN_IMAGE'})
          }
        };
      });
    }

    function _hasDimensionFilter(options) {
      var filters = _.filter(_getDimensionFilters(), function (prop) {
        return options[prop];
      });

      return filters.length > 0;
    }

    return {
      filter: filter
    };
  }
})();
