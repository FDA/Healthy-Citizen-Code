;(function () {
  "use strict";

  angular
    .module("app.adpApi")
    .factory("AdpSocketIoService", AdpSocketIoService);

  /** @ngInject */
  function AdpSocketIoService(
    APP_CONFIG,
    $http,
    $state,
    $location,
    AdpNotificationService
  ) {
    var socket = null;
    var messageProcessors = [defaultMessageProcessor];
    var socketMessagesTypes = {
      backgroundJobs: "Background Jobs",
    }

    function initialize(){
      if (lsService.isGuest()) {
        return;
      }

      var authHeader = "JWT " + lsService.getToken();

      socket = io.connect(APP_CONFIG.apiUrl, {
        extraHeaders: {Authorization: authHeader},
        transportOptions: {
          polling: {
            extraHeaders: {
              Authorization: authHeader
            }
          }
        }
      });

      socket.on("unauthorized", function (err) {
        AdpNotificationService.notifyError( err.message, "SocketIO Auth error");
      });

      socket.on("authenticated", function () {
        console.log("SocketIO: Successfully authenticated");
        subscribeMessage();
      });
    }

    function login() {
      if (!socket) {
        initialize();
      }

      if (socket) {
        socket.emit("authentication", {});
      }
    }

    function logout() {
      if (socket) {
        socket.close();
        socket = null;
      }
    }

    function subscribeMessage(){
      socket.on("message", applyProcessorQueueToMessage);
    }

    function defaultMessageProcessor(data) {
      if (data.level==='error') {
        AdpNotificationService.notifyError(data.message, getHumanizedType(data.type));
      } else {
        AdpNotificationService.notifySuccess(data.message, getHumanizedType(data.type));
      }
    }

    function applyProcessorQueueToMessage(data) {
       var i=0;

       while (i < messageProcessors.length) {
         var processor = messageProcessors[i];

          if (!processor(data)) {
            break;
          } else {
            i++;
          }
       }
    }

    function registerMessageProcessor(processor) {
      messageProcessors.unshift(processor);
    }

    function unRegisterMessageProcessor(processor) {
      var index = messageProcessors.indexOf(processor);
      if (index >= 0) {
        messageProcessors.splice(index, 1);
      }
    }

    function getHumanizedType(type){
      return socketMessagesTypes[type] || type;
    }

    return {
      login: login,
      logout: logout,
      registerMessageProcessor:registerMessageProcessor,
      unRegisterMessageProcessor:unRegisterMessageProcessor,
    }
  }
})();
