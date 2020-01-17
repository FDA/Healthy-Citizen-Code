;(function() {
  'use strict';

  angular
    .module('app.adpCommon')
    .service('ServerError', ServerError);

  /** @ngInject */
  function ServerError() {
    function _ServerError(message) {
      Error.call(this, message) ;
      this.name = "_ServerError";

      this.message = message;

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, _ServerError);
      } else {
        this.stack = (new Error()).stack;
      }

    }

    _ServerError.prototype = Object.create(Error.prototype);

    _ServerError.UNABLE_SEND = 'Unable to send data.'
    _ServerError.UNABLE_TO_GET_DATA = 'Unable to get data.'

    return _ServerError;
  }
})();
