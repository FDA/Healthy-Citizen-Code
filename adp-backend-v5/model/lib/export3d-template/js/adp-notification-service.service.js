;(function () {

  /* This is exact cope of same module from frontend, copied here just because this code doesnt have access to front-end on build time, yet*/

  var MESSAGE_LENGTH_TRUNCATE = 120;

  angular
    .module("app.adpCommon")
    .factory("AdpNotificationService", AdpNotificationService);

  /** @ngInject */
  function AdpNotificationService() {
    var service = {
      notifyError: notifyError,
      notifySuccess: notifySuccess,
      errorCounter: 0
    };

    return service;

    function notifyError(message, title, options) {
      ++service.errorCounter; // it's never used, in fact...

      var $toast = toastr.error(modifyLongMessage(message), title, Object.assign({
        containerId: "toast-container-error",
        positionClass: "toast-container-universal",
        timeOut: 0,
        extendedTimeOut: 0,
        closeButton: true,
        tapToDismiss: false,
        newestOnTop: false,
      }, options || {}));

      if ($toast.find(".toast-more-link").length) {
        $toast.delegate(".toast-more-link", "click", function () {
          $toast.addClass("toast-expanded");
        });
        $toast.delegate(".toast-full-message", "click", function () {
          $toast.removeClass("toast-expanded");
        });
      }
    }

    function notifySuccess(message, title, options) {
      toastr.success(message, title, Object.assign({
        containerId: "toast-container-success",
        positionClass: "toast-container-universal",
        closeButton: true,
        newestOnTop: false,
      }, options || {}));
    }

    function modifyLongMessage(msg) {
      var newMsg = msg;
      if (msg.length > MESSAGE_LENGTH_TRUNCATE) {
        newMsg =
          "<div class='toast-shorter-message'>" +
          msg.substr(0, MESSAGE_LENGTH_TRUNCATE) +
          "&#8230;" +
          "<div class='toast-more-link'>More&#8230;</div>" +
          "</div>" +
          "<div class='toast-full-message'>" +
          msg +
          "</div>"
      }

      return newMsg;
    }
  }
})();
