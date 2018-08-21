;(function () {
  'use strict';

  angular
    .module('app.adpUploader')
    .factory('AdpUploaderFilters', AdpUploaderFilters);

  /** @ngInject */
  function AdpUploaderFilters(AdpMimeService) {
    var filters = {
      maxFileSize: {
        name: 'maxFileSize',
        fn: function(item, options) {
          return item.size <= options.maxFileSize;
        }
      },
      mimeType: {
        name: 'mimeType',
         fn: function(item, options) {
          var type = options.mimeType;
           return AdpMimeService.validate(item.name, type);
        }
      },
      folder: {
        name: 'folder',
        fn: function (item) {
          return item.type;
        }
      }
    };

    return {
      getCustomList: function () {
        return ['maxFileSize', 'folder', 'mimeType'];
      },
      filters: function () {
        return filters;
      }
    };
  }
})();
