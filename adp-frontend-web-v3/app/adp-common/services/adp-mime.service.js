;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .factory('AdpMimeService', AdpMimeService);

  /** @ngInject */
  function AdpMimeService(MEDIA_TYPES) {
    function validate(filename, presetName) {
      return _checkFileType(filename, MEDIA_TYPES[presetName]);
    }

    function _checkFileType(filename, fileTypes) {
      var ext = filename.split('.').pop();
      var types = fileTypes.join('|');

      return types.indexOf(ext) !== -1;
    }

    function getFileType(filename) {
      var ext = filename.split('.').pop();

      return _.findKey(MEDIA_TYPES, function(typeArray, key) {
        if (key === 'any') return false;
        return typeArray.indexOf(ext) > -1;
      });
    }

    function isImage(filename) {
      return _checkFileType(filename, MEDIA_TYPES['images']);
    }

    function isVideo(filename) {
      return _checkFileType(filename, MEDIA_TYPES['video']);
    }

    function isAudio(filename) {
      return _checkFileType(filename, MEDIA_TYPES['audio']);
    }

    function isDocument(filename) {
      return _checkFileType(filename, MEDIA_TYPES['docs']);
    }

    function any() {
      var types = _.flatMap(MEDIA_TYPES);
      return _checkFileType(filename, types);
    }

    return {
      getFileType: getFileType,
      validate: validate,
      isImage: isImage,
      isVideo: isVideo,
      isAudio: isAudio,
      isDocument: isDocument
    };
  }
})();
