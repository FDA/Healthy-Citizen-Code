;(function () {
  var MESSAGE_LENGTH_TRUNCATE = 120;
  var CONTAINER_ID_ERROR = "toast-container-error";
  var MESSAGES_BEFORE_STACK = 1;

  angular
    .module("app.adpCommon")
    .factory("AdpNotificationHelper", AdpAdpNotificationHelper);

  /** @ngInject */
  function AdpAdpNotificationHelper() {

    return {
      doRefreshTabs: doRefreshTabs,
      highlightToast: highlightToast,
      getToastsContainer: getToastsContainer,
      modifyLongMessage: modifyLongMessage,
      CONTAINER_ID_ERROR: CONTAINER_ID_ERROR
    };

    function doRefreshTabs() {
      var $container = getToastsContainer();

      if (!$container) {
        return;
      }

      var $toasts = $(".toast:not(.toast-expanded)", $container);
      var $closeAll = $(".close-all-toast", $container);

      _.each($toasts, function (toast, index) {
        var $toast = $(toast);
        var isTabbed = index < $toasts.length - MESSAGES_BEFORE_STACK;

        $toast.toggleClass("toast-tab", isTabbed);
        $toast[isTabbed ? "on" : "off"]("click", onTabToastClick);
      });

      if (!$closeAll.length && $toasts.length > 1) {
        $("<a>")
          .addClass("close-all-toast")
          .text("close all")
          .click(onCloseAllClick)
          .prependTo($container);
      } else if ($closeAll.length && $toasts.length < 2) {
        $closeAll.remove();
      }
    }

    function onCloseAllClick(e) {
      var $container = getToastsContainer();
      var $toasts = $(".toast", $container);

      _.each($toasts, function (toast) {
        toastr.clear($(toast))
      });

      $(e.target)
        .remove();
    }

    function onTabToastClick(e) {
      var $container = getToastsContainer();
      var $toast = $(e.target);

      $container.append($toast.detach());
      highlightToast($toast);

      doRefreshTabs();
    }

    function highlightToast($toast) {
      $toast.css("backgroundColor", "#c3482d")
        .animate({backgroundColor: "#C46A69"}, 500);
    }

    function getToastsContainer() {
      return $("#" + CONTAINER_ID_ERROR);
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
