;(function() {
  'use strict';

  angular
    .module('app.adpCommon')
    .service('ErrorHelpers', ErrorHelpers);

  /** @ngInject */
  function ErrorHelpers(
    ServerError,
    ResponseError,
    UploadError,
    ClientError,
    AdpNotificationService
  ) {
    return {
      handleError: function (error, defaultMessage) {
        var shouldDisplayToUser = (error instanceof UploadError) || (error instanceof ResponseError)|| (error instanceof ClientError);

        if (shouldDisplayToUser) {
          AdpNotificationService.notifyError(error.message);
        } else if (error instanceof ServerError) {
          var messages = Array.isArray(error.message) ? error.message : [error.message];

          AdpNotificationService.notifyError(messages.join('<br/>'), 'Server error');
        } else {
          console.error(defaultMessage, error);
        }
      }
    }
  }
})();
