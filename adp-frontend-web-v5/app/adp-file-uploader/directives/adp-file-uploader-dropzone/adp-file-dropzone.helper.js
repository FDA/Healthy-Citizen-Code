;(function () {
  "use strict";

  angular
    .module("app.adpUploader")
    .factory("AdpFileDropzoneHelper", adpFileDropzoneHelper);

  /** @ngInject */
  function adpFileDropzoneHelper() {
    var eventNamespace = "adpFileDropZone";
    var dragOverClassName = "adp-file-uploader-over";
    var events = {
      "dragover": "dragover." + eventNamespace,
      "dragenter": "dragenter." + eventNamespace,
      "dragcancel": ["dragleave." + eventNamespace, "dragend." + eventNamespace].join(" "),
      "drop": "drop." + eventNamespace
    };

    function bindEvents(dropzone, handlers) {
      $(window)
        .on(events.dragover, preventDefault);
      $(window)
        .on(events.drop, preventDefault);

      // allow drop by preventDefault behavior on drop
      dropzone.on(events.dragover, preventDefault);
      dropzone.on(events.dragenter, function (e) {
        preventDefault(e);
        dropzone.addClass(dragOverClassName);
      });
      dropzone.on(events.dragcancel, function (e) {
        preventDefault(e);
        dropzone.removeClass(dragOverClassName);
      });
      dropzone.on(events.drop, function (e) {
        if (_.isFunction(handlers.onDrop)) {
          preventDefault(e);
          handlers.onDrop(e);
        }

        dropzone.removeClass(dragOverClassName);
      });
    }

    function getUnbindEvents(dropzone) {
      return function () {
        dropzone.off(events.dragover);
        dropzone.off(events.dragenter);
        dropzone.off(events.dragcancel);
        dropzone.off(events.drop);

        $(window)
          .off(events.dragover);
        $(window)
          .off(events.drop);
      }
    }

    function preventDefault(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    return {
      bindEvents: bindEvents,
      getUnbindEvents: getUnbindEvents,
    };
  }
})();
