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
      notifySuccess: notifySuccess,
      closeAll: closeAll,
    };

    function notifyError(message, title, options){
      return _addTabbedToast('error', message, title, Object.assign({
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

    function _addTabbedToast(method, message, title, options){
      var boxId = options.containerId || 'toaster-box-'+method;
      var config = _getToastsConfig( boxId );

      options.containerId = boxId;
      options.onHidden = _onCloseToast;
      options.onCloseClick = _onCloseClick;

      var $toast = toastr[method](_modifyLongMessage(message), title, options);

      if ($toast) {
        _highlightToast($toast);

        if ($toast.find(".toast-more-link").length) {
          $toast.delegate(".toast-more-link", "click", function () {
            $(".toast", config.$toastBox).removeClass("toast-expanded");
            $toast.addClass("toast-expanded");
          });

          $toast.delegate(".toast-full-message", "click", function () {
            $toast.removeClass("toast-expanded");
            _activateToast($toast);
          });
        }

        var $tab = _addToastTab($toast);

        $tab.attr("title", message.substr(0, 30) + ( message.length > 30 ? "..." : ""));

        _activateToast($toast);
      }

      function _onCloseClick(e){
        var $toast = $(e.target).closest('.toast');

        config.lastIndex = _getToastIndex($toast);
      }

      function _onCloseToast(){
        var $tabs = $('.toast-tab', config.$tabBox);
        var index = config.lastIndex;

        $($tabs.get(index)).remove();
        setTimeout(_onAfterCloseToast,0);
      }

      function _onAfterCloseToast(){
        var $toasts = $('.toast', config.$toastBox);
        var index = config.lastIndex;

        if ($toasts.length) {
          _activateToast( $($toasts.get(Math.min(index, $toasts.length - 1))));
          _doRefreshCloseAll();
        } else {
          _clearContainer(config);
        }
      }

      function _getToastIndex($toast) {
        var $toasts = $('.toast', config.$toastBox);
        return $toasts.index($toast);
      }

      function _activateToast($toast) {
        var $toasts = $('.toast', config.$toastBox);
        var index = _getToastIndex($toast);
        var $tabs =  $('.toast-tab', config.$tabBox).removeClass('toast-tab-active');

        $toasts.removeClass('toast-expanded').addClass('toast-hidden');
        $($tabs.get(index)).addClass('toast-tab-active');
        $($toasts.get(index)).removeClass('toast-hidden');
      }

      function _addToastTab($toast) {
        var $tab = $('<div>').addClass('toast-tab toast-' + method);

        $tab.click(function(){
          _activateToast($toast);
        });

        $tab.appendTo(config.$tabBox);
        _doRefreshCloseAll();

        return $tab;
      }

      function _doRefreshCloseAll() {
        var $toasts = $(".toast", config.$toastBox);
        var $closeAll = $(".close-all-toast", config.$tabBox);

        if (!$closeAll.length && $toasts.length > 1) {
          $("<div>")
            .addClass("close-all-toast")
            .append($("<a>")
              .text("close all")
              .click(closeAll)
            )
            .prependTo(config.$tabBox);
        } else if ($closeAll.length && $toasts.length < 2) {
          $closeAll.remove();
        }
      }
    }

    function closeAll() {
      var config = _getToastsConfig(CONTAINER_ID_ERROR);
      var $toasts = $('.toast', config.$toastBox);
      var $closeAll = $('.close-all-toast > a', config.$tabBox);

      _.each($toasts, function (toast) {
        toastr.clear($(toast))
      });

      $closeAll.remove();
      setTimeout(function(){
        _clearContainer(config)
      }, 200);
    }

    function _clearContainer(config){
      config.$box.remove();
      state[config.id] = null;
    }

    function _highlightToast($toast) {
      $toast.css("backgroundColor", "#c3482d")
        .animate({backgroundColor: "#C46A69"}, 500);
    }

    function _modifyLongMessage(msg) {
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

    function _getToastsConfig(boxId){
      var config = state[boxId];

      if (!config) {
        var $box = $('<div id="' + boxId + '-box">').appendTo(document.body);
        var $tabBox = $('<div id="'+boxId+'-tabs">').appendTo($box);
        var $toastBox = $('<div id="'+boxId+'" class="toast-container-universal">').appendTo($box);

        state[boxId] = config = {
          id: boxId,
          $box: $box,
          $tabBox : $tabBox,
          $toastBox: $toastBox,
        }
      }

      return config;
    }
  }
})();
