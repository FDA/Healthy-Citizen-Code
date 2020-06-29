;(function () {
  var MESSAGE_LENGTH_TRUNCATE = 120;
  var CONTAINER_ID_ERROR = "toast-container-error";

  angular
    .module("app.adpCommon")
    .factory("AdpNotificationService", AdpNotificationService);

  /** @ngInject */
  function AdpNotificationService() {
    var state = {};

    return {
      notifyError: notifyError,
      notifySuccess: notifySuccess
    };

    function notifyError(message, title, options){
      return addTabbedToast('error', message, title, Object.assign({
        containerId: CONTAINER_ID_ERROR,
        positionClass: "toast-container-universal",
        timeOut: 0,
        extendedTimeOut: 0,
        preventDuplicates: true,
        closeButton: true,
        tapToDismiss: false,
        newestOnTop: false,
        hideDuration: 200,
      }, options || {}));
    }

    function notifySuccess(message, title, options){
      return toastr.success(message, title, Object.assign({
        containerId: "toast-container-success",
        positionClass: "toast-container-universal",
        closeButton: true,
        newestOnTop: false,
      }, options || {}));
    }

    function addTabbedToast(method, message, title, options){
      var boxId = options.containerId || 'toaster-box-'+method;
      var config = getToastsConfig( boxId );

      options.containerId = boxId;
      options.onHidden = onCloseToast;
      options.onCloseClick = onCloseClick;

      var $toast = toastr[method](modifyLongMessage(message), title, options);

      if ($toast) {
        highlightToast($toast);

        if ($toast.find(".toast-more-link").length) {
          $toast.delegate(".toast-more-link", "click", function () {
            $(".toast", config.$toastBox).removeClass("toast-expanded");
            $toast.addClass("toast-expanded");
          });

          $toast.delegate(".toast-full-message", "click", function () {
            $toast.removeClass("toast-expanded");
            activateToast($toast);
          });
        }

        var $tab = addToastTab($toast);

        $tab.attr("title", message.substr(0, 30) + ( message.length > 30 ? "..." : ""));

        activateToast($toast);
      }

      function onCloseClick(e){
        var $toast = $(e.target).closest('.toast');

        config.lastIndex = getToastIndex($toast);
      }

      function onCloseToast(){
        var $tabs = $('.toast-tab', config.$tabBox);
        var index = config.lastIndex;

        $($tabs.get(index)).remove();
        setTimeout(onAfterCloseToast,0);
      }

      function onAfterCloseToast(){
        var $toasts = $('.toast', config.$toastBox);
        var index = config.lastIndex;

        if ($toasts.length) {
          activateToast( $($toasts.get(Math.min(index, $toasts.length - 1))));
          doRefreshCloseAll();
        } else {
          clearContainer();
        }
      }

      function clearContainer(){
        config.$box.remove();
        state[boxId] = null;
      }

      function getToastIndex($toast) {
        var $toasts = $('.toast', config.$toastBox);
        return $toasts.index($toast);
      }

      function activateToast($toast) {
        var $toasts = $('.toast', config.$toastBox);
        var index = getToastIndex($toast);
        var $tabs =  $('.toast-tab', config.$tabBox).removeClass('toast-tab-active');

        $toasts.removeClass('toast-expanded').addClass('toast-hidden');
        $($tabs.get(index)).addClass('toast-tab-active');
        $($toasts.get(index)).removeClass('toast-hidden');
      }

      function addToastTab($toast) {
        var $tab = $('<div>').addClass('toast-tab toast-' + method);

        $tab.click(function(){
          activateToast($toast);
        });

        $tab.appendTo(config.$tabBox);
        doRefreshCloseAll();

        return $tab;
      }

      function doRefreshCloseAll() {
        var $toasts = $(".toast", config.$toastBox);
        var $closeAll = $(".close-all-toast", config.$tabBox);

        if (!$closeAll.length && $toasts.length > 1) {
          $("<div>")
            .addClass("close-all-toast")
            .append($("<a>")
              .text("close all")
              .click(onCloseAllClick)
            )
            .prependTo(config.$tabBox);
        } else if ($closeAll.length && $toasts.length < 2) {
          $closeAll.remove();
        }
      }

      function onCloseAllClick(e) {
        var $toasts = $(".toast", config.$toastBox);

        _.each($toasts, function (toast) {
          toastr.clear($(toast))
        });

        $(e.target).remove();
        setTimeout(clearContainer, 200);
      }
    }

    function highlightToast($toast) {
      $toast.css("backgroundColor", "#c3482d")
        .animate({backgroundColor: "#C46A69"}, 500);
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

    function getToastsConfig(boxId){
      var config = state[boxId];

      if (!config) {
        var $box = $('<div id="' + boxId + '-box">').appendTo(document.body);
        var $tabBox = $('<div id="'+boxId+'-tabs">').appendTo($box);
        var $toastBox = $('<div id="'+boxId+'" class="toast-container-universal">').appendTo($box);

        state[boxId] = config = {
          $box: $box,
          $tabBox : $tabBox,
          $toastBox: $toastBox,
        }
      }

      return config;
    }
  }
})();
