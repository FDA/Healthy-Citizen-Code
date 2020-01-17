;(function () {
  'use strict';

  angular
    .module('app.adpUploader')
    .factory('AdpFilePathService', AdpFilePathService);

  /** @ngInject */
  function AdpFilePathService(APP_CONFIG) {
    function _path(name, fileItem) {
      return [APP_CONFIG.apiUrl, name, fileItem.id].join('/');
    }

    return {
      file: _path.bind(this, 'file'),
      cropped: _path.bind(this, 'file-cropped'),
      thumb: _path.bind(this, 'file-thumbnail'),
      download: _path.bind(this, 'download')
    }
  }
})();
