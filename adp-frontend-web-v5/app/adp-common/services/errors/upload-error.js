;(function() {
  'use strict';

  angular
    .module('app.adpCommon')
    .service('UploadError', UploadError);

  /** @ngInject */
  function UploadError() {
    function _UploadError(message) {
      Error.call(this, message) ;
      this.name = "_UploadError";

      this.message = message;

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, _UploadError);
      } else {
        this.stack = (new Error()).stack;
      }

    }

    _UploadError.prototype = Object.create(Error.prototype);

    return _UploadError;
  }
})();
