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
      socket.on("message", function (data) {
        AdpNotificationService.notifySuccess( data.message, data.type);
      });
    }

    return {
      login: login,
      logout: logout
    }
  }
})();
