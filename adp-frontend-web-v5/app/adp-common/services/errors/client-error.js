;(function() {
  'use strict';

  angular
    .module('app.adpCommon')
    .service('ClientError', ClientError);

  /** @ngInject */
  function ClientError() {
    function _ClientError(message) {
      Error.call(this, message) ;
      this.name = "_ClientError";

      this.message = message;

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, _ClientError);
      } else {
        this.stack = (new Error()).stack;
      }

    }

    _ClientError.prototype = Object.create(Error.prototype);

    return _ClientError;
  }
})();
