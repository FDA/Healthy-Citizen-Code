;(function() {
  'use strict';

  angular
    .module('app.adpCommon')
    .service('ResponseError', ResponseError);

  /** @ngInject */
  function ResponseError() {
    function _ResponseError(message) {
      Error.call(this, message) ;
      this.name = "_ResponseError";

      this.message = message;

      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, _ResponseError);
      } else {
        this.stack = (new Error()).stack;
      }

    }

    _ResponseError.prototype = Object.create(Error.prototype);
    _ResponseError.RECORD_NOT_FOUND = 'Record not found';
    _ResponseError.SCHEMA_IS_EMPTY = 'Scheme is empty';

    return _ResponseError;
  }
})();
