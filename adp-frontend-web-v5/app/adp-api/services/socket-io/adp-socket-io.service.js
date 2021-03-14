(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('AdpSocketIoService', AdpSocketIoService);

  /** @ngInject */
  function AdpSocketIoService(
    APP_CONFIG,
    $http,
    $state,
    $location,
    AdpSessionHelper,
    AdpModalService,
    AdpNotificationService
  ) {
    var activeSocket = null;
    var tokenIsRefreshingNow = false;
    var messageProcessors = [{processor: defaultMessageProcessor}];
    var standardMessageHandlers = {
      message: defaultHandlerTypeMessage,
      logoutNotification: logoutHandler,
      backgroundJobs: simpleBackgroundJobsHandler,
    }

    function login() {
      if (lsService.isGuest()) {
        return;
      }

      if (!io) {
        socketLog('API not found');
        return;
      }

      connectSocket();
    }

    function setupSocketHandlers(socket) {
      socket.on('unauthorized', function (err) {
        socketLog('Auth error');
        if (!tokenIsRefreshingNow) {
          socket.close();
          socketLog('Finally disconnected');
          lsService.removeUserData();
          $state.go('auth.login');
        } else {
          socketLog('Waiting token to refresh');
        }
      });

      socket.on('authenticated', function () {
        socketLog('Successfully authenticated');
      });

      socket.on('message', applyProcessorQueueToMessage);

      socket.on('disconnect', function (reason) {
        socketLog('Disconnected');

        if (reason === 'io server disconnect' && !lsService.isGuest()) {
          socketLog('Reconnecting...');

          connectSocket();
        }
      });

      socket.on('connect_timeout', function (timeout) {
        socketLog('Connection timeout ' + timeout);
      });

      socket.on('error', function (error) {
        socketLog('Error: ' + error);
      });

      socket.on('reconnect', function () {
        socketLog('Reconnected. Token refresh start.');
        socket.close();

        tokenIsRefreshingNow = true;

        AdpSessionHelper
          .setTokenRefreshTimeout(true)
          .then(connectSocket)
          .finally(function () {
            tokenIsRefreshingNow = false;
          });
      });

      socket.on('reconnect_attempt', function (attemptNumber) {
        var authHeader = getAuthString();

        socketLog('Reconnect attempt #' + attemptNumber);

        socket.io.opts.extraHeaders.Authorization =
          socket.io.opts.transportOptions.polling.Authorization = authHeader;
      });

      socket.on('connect', function () {
        socketLog('Connected');
      });
    }

    function getAuthString() {
      return 'JWT ' + lsService.getToken();
    }

    function connectSocket() {
      var authHeader = getAuthString();

      if (activeSocket && activeSocket.connected) {
        activeSocket.close();
        socketLog('Closing currently active socket');
      }

      socketLog('Connect attempt...');

      activeSocket = io.connect(APP_CONFIG.serverBaseUrl, {
        path: APP_CONFIG.apiPrefix + '/socket.io',
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

      if (activeSocket) {
        setupSocketHandlers(activeSocket);
      } else {
        socketLog('Initialization failed');
      }
    }

    function socketLogout() {
      if (activeSocket) {
        activeSocket.close();
      }
    }

    function defaultMessageProcessor(data) {
      var standardTypeHandler = standardMessageHandlers[data.type];

      if (_.isFunction(standardTypeHandler)) {
        standardTypeHandler(data);
      }
    }

    function defaultHandlerTypeMessage(data) {
      var notifyType = _.get(data, 'data.msgType', 'success');
      var notificationTypes = {
        success: 'notifySuccess',
        error: 'notifyError',
      }
      AdpNotificationService[notificationTypes[notifyType] || notificationTypes.success](
        data.data.msgText || '-void-',
        data.data.msgTitle
      );
    }

    function logoutHandler() {
      AdpSessionHelper.doLogout();
    }

    function simpleBackgroundJobsHandler(data){
      var notificationMethod = _.get(data, 'level') === 'error' ? 'notifyError' :  'notifySuccess';

      AdpNotificationService[notificationMethod](
        data.message,
        'Background jobs'
      );
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
      var item = {processor: processor};

      if (params) {
        item.params = params;
      }

      messageProcessors.unshift(item);
    }

    function unRegisterMessageProcessor(processor) {
      var index = _.findIndex(messageProcessors, function (item) {
        return item.processor === processor
      });

      if (index >= 0) {
        messageProcessors.splice(index, 1);
      }
    }

    function socketLog(message) {
      console.log('SocketIO: ', message);
    }

    return {
      login: login,
      socketLogout: socketLogout,
      registerMessageProcessor: registerMessageProcessor,
      unRegisterMessageProcessor: unRegisterMessageProcessor,
    };
  }
})();
