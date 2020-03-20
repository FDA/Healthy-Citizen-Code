;(function () {
  angular
    .module("app.adpCommon")
    .factory("AdpNotificationService", AdpAdpNotificationService);

  /** @ngInject */
  function AdpAdpNotificationService(
    AdpNotificationHelper
  ) {
    return {
      notifyError: notifyError,
      notifySuccess: notifySuccess
    };

    function notifyError(message, title, options) {
      var $toast = toastr.error(AdpNotificationHelper.modifyLongMessage(message), title, Object.assign({
        containerId: AdpNotificationHelper.CONTAINER_ID_ERROR,
        positionClass: "toast-container-universal",
        timeOut: 0,
        extendedTimeOut: 0,
        preventDuplicates: true,
        closeButton: true,
        tapToDismiss: false,
        newestOnTop: false,
        hideDuration: 200,
        onHidden: function () {
          AdpNotificationHelper.doRefreshTabs();
        }
      }, options || {}));

      // may be undefined in case preventDuplication in force
      if ($toast) {
        AdpNotificationHelper.highlightToast($toast);

        if ($toast.find(".toast-more-link").length) {
          $toast.delegate(".toast-more-link", "click", function () {
            $(".toast", AdpNotificationHelper.getToastsContainer())
              .removeClass("toast-expanded");
            $toast.addClass("toast-expanded");

            AdpNotificationHelper.highlightToast($toast);
            AdpNotificationHelper.doRefreshTabs();
          });
          $toast.delegate(".toast-full-message", "click", function () {
            $toast.removeClass("toast-expanded");

            AdpNotificationHelper.highlightToast($toast);
            AdpNotificationHelper.doRefreshTabs();
          });
        }

        $toast.attr("title", message.substr(0, 30) + "...");

        AdpNotificationHelper.doRefreshTabs();
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
  }
})();
