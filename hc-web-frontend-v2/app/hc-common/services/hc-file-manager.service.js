;(function () {
  angular
    .module('app.hcCommon')
    .factory('HcFileManagerService', HcFileManagerService);

  function HcFileManagerService() {
    return {
      invokeSaveAsDialog: invokeSaveAsDialog,
      dataURItoFile: dataURItoFile
    };

    /**
     * @param {Blob} file - File or Blob object. This parameter is required.
     * @param {string} fileName - Optional file name e.g. "Recorded-Video.webm"
     * @example
     * invokeSaveAsDialog(blob or file, [optional] fileName);
     * @see {@link https://github.com/muaz-khan/RecordRTC|RecordRTC Source Code}
     */
    function invokeSaveAsDialog(file, fileName) {
      if (!file) {
        throw 'Blob object is required.';
      }

      if (!file.type) {
        try {
          file["type"] = 'video/webm';
        } catch (e) {}
      }

      var fileExtension = (file.type || 'video/webm').split('/')[1];

      if (fileName && fileName.indexOf('.') !== -1) {
        var splitted = fileName.split('.');
        fileName = splitted[0];
        fileExtension = splitted[1];
      }

      var fileFullName = (fileName || (Math.round(Math.random() * 9999999999) + 888888888)) + '.' + fileExtension;

      if (typeof navigator.msSaveOrOpenBlob !== 'undefined') {
        return navigator.msSaveOrOpenBlob(file, fileFullName);
      } else if (typeof navigator.msSaveBlob !== 'undefined') {
        return navigator.msSaveBlob(file, fileFullName);
      }

      var hyperlink = document.createElement('a');
      hyperlink.href = URL.createObjectURL(file);
      hyperlink.download = fileFullName;

      hyperlink.style = 'display:none;opacity:0;color:transparent;';
      (document.body || document.documentElement).appendChild(hyperlink);

      if (typeof hyperlink.click === 'function') {
        hyperlink.click();
      } else {
        hyperlink.target = '_blank';
        hyperlink.dispatchEvent(new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true
        }));
      }

      URL.revokeObjectURL(hyperlink.href);
    }

    function dataURItoFile(dataURI) {
      var arr = dataURI.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
      while(n--){
        u8arr[n] = bstr.charCodeAt(n);
      }

      var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
      var filename = [Date.now(), mimeString.split('/')[1]].join('.');

      return new File([u8arr], filename, {type:mime});
    }
  }
})();