;(function () {
  angular
    .module("app.adpCommon")
    .factory("AdpFileDownloader", AdpFileDownloader);

  function AdpFileDownloader(
    $timeout
  ) {
    return function (params) {
      var a = document.createElement("a");
      var type = params.mimeType || "text/plain";
      var fileName = params.fileName || ("downloaded_" + (new Date()).getTime());
      var blob = new Blob([params.buffer], {type: type});

      if (window.navigator.msSaveOrOpenBlob) {     // IE11
        window.navigator.msSaveOrOpenBlob(blob, fileName);
      } else {
        var url = window.URL.createObjectURL(blob);
        document.body.appendChild(a);
        a.style.display = "none";
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
        $timeout(function () { //Just to make sure no special effects occurs
          document.body.removeChild(a);
        }, 2000);
      }
    }
  }
})();
