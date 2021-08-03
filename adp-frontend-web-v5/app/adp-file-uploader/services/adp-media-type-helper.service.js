;(function () {
  'use strict';

  angular
    .module('app.adpUploader')
    .factory('AdpMediaTypeHelper', AdpMediaTypeHelper);

  /** @ngInject */
  function AdpMediaTypeHelper(
    APP_CONFIG,
    $http
  ) {
    var FILE_TYPES = {
      ASIS: 'asis',
      CROPPED: 'cropped',
      THUMBNAIL: 'thumbnail',
    };

    function getFileLink(fileItem, fileType) {
      var fileTypeToRequest = fileType || 'asis';
      var endpoint = '/file-link/' + fileItem.id + '?fileType=' + fileTypeToRequest;

      return $http.get(APP_CONFIG.apiUrl + endpoint)
        .then(function (resp) {
          return getLink(_.get(resp, 'data.data.linkId'));
        });
    }

    function getLink(linkId, attachment) {
      var link = [APP_CONFIG.apiUrl, 'file', linkId].join('/');

      if (attachment) {
        link += 'attachment=true'
      }

      return link;
    }

    function getDownloadLink(fileItem) {
      return getFileLink(fileItem)
        .then(function (src) {
          return src + '?attachment=true';
        });
    }

    function callSaveDialog(fileItem, src) {
      var a = document.createElement('a');
      document.body.appendChild(a);
      a.style.display = 'none';
      a.href = src;
      a.target = '_blank';
      a.download = fileItem.name;
      a.click();
      setTimeout(function () {
        document.body.removeChild(a);
      }, 2000);
    }

    return {
      getFileLink: getFileLink,
      getCroppedImgLink: _.partialRight(getFileLink, FILE_TYPES.CROPPED),
      getThumbImgLink: _.partialRight(getFileLink, FILE_TYPES.THUMBNAIL),
      getDownLoadLink: getDownloadLink,
      downloadWithSaveDialog: function (fileItem) {
        return getDownloadLink(fileItem)
          .then(function (src) {
            callSaveDialog(fileItem, src);
          });
      }
    }
  }
})();
