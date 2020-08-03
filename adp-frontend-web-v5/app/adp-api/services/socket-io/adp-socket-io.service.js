(function () {
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
    AdpNotificationService,
    AdpModalService
  ) {
    var socket = null;
    var messageProcessors = [{processor:defaultMessageProcessor}];
    var socketMessagesTypes = {
      backgroundJobs: "Background Jobs",
    };

    function login() {
      if (lsService.isGuest()) {
        return;
      }

      var authHeader = "JWT " + lsService.getToken();

      if (!io) {
        console.error("Socket IO api not found");
        return;
      }

      socket = io.connect(APP_CONFIG.serverBaseUrl, {
        path: APP_CONFIG.apiPrefix + "/socket.io",
        forceNew: true,
        extraHeaders: {Authorization: authHeader},
        reconnectionDelayMax: 64000,
        transportOptions: {
          polling: {
            extraHeaders: {
              Authorization: authHeader,
            },
          },
        },
      });

      if (!socket) {
        console.error("Socket initialisation failed");
        return;
      }

      socket.on("unauthorized", function (err) {
        socket = null;
        console.log("SocketIO: Auth error, disconnected");
        lsService.removeUserData();

        AdpModalService.confirm({
          message: "User session is expired. Please login again.",
          backdropClass: "adp-hide-backdrop",
          windowClass: "adp-session-expired-modal",
          hideCancelButton: true,
          okButtonText: "Go to Login page"
        }).then(function (res) {
          return $state.go("auth.login");
        })
      });
      socket.on("authenticated", function () {
        console.log("SocketIO: successfully authenticated");
      });
      socket.on("message", applyProcessorQueueToMessage);
      socket.on("disconnect", function (reason) {
        if (socket === null) {
          return;
        }

        if (socket.io.connecting.indexOf(socket) !== -1) {
          return console.log(
            "SocketIO: disconnected by reason '" +
            reason +
            "'. It will automatically try to reconnect"
          );
        }
        // disconnection was initiated by the server, need to reconnect manually
        console.log(
          "SocketIO: disconnection was initiated by the server, trying to reconnect..."
        );
        socket.connect();
      });
      socket.on("connect_timeout", function (timeout) {
        console.log("SocketIO: connection timeout " + timeout);
      });
      socket.on("error", function (error) {
        console.log("SocketIO: error: " + error);
      });
      socket.on("reconnect", function (attemptNumber) {
        console.log(
          "SocketIO: successfully reconnected with attempt number " +
          attemptNumber
        );
      });
      socket.on("reconnect_attempt", function (attemptNumber) {
        console.log("SocketIO: reconnect attempt number " + attemptNumber);
      });
      socket.on("connect", function () {
        console.log("SocketIO: connected");
      });

    }

    function logout() {
      if (socket) {
        socket.close();
        socket = null;
      }
    }

    function defaultMessageProcessor(data) {
      if (data.level === "error") {
        AdpNotificationService.notifyError(
          data.message,
          getHumanizedType(data.type)
        );
      } else {
        AdpNotificationService.notifySuccess(
          data.message,
          getHumanizedType(data.type)
        );
      }
    }

    function applyProcessorQueueToMessage(data) {
      var i = 0;

      while (i < messageProcessors.length) {
        var item = messageProcessors[i];
        var processor = item.processor;

        if (processor) {
          var processorResult = processor(data, item.params);

          if (processorResult === false) {
            break;
          } else {
            i++;
          }
        }
      }
    }

    function registerMessageProcessor(processor, params) {
      messageProcessors.unshift({processor: processor, params: params});
    }

    function unRegisterMessageProcessor(processor) {
      var index = _.findIndex(messageProcessors, function(item){ return item.processor===processor});

      if (index >= 0) {
        messageProcessors.splice(index, 1);
      }
    }

    function getHumanizedType(type) {
      return socketMessagesTypes[type] || type;
    }

    return {
      login: login,
      logout: logout,
      registerMessageProcessor: registerMessageProcessor,
      unRegisterMessageProcessor: unRegisterMessageProcessor,
    };
  }
})();
