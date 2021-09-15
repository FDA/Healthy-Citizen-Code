(function () {
  angular.module('app.adpWebTerminal', [])
    .controller('AdpWebTerminal', WebTerminal);

  var MINIMUM_COLS = 5;
  var MINIMUM_ROWS = 3;
  var SERVER_TERMINATE_MESSAGE = 'SERVER signalled terminal exit...';

  /** @ngInject */
  function WebTerminal(
    APP_CONFIG,
    $state,
    $scope,
    $http,
    AdpSocketIoService,
    AdpClientCommonHelper,
    AdpNotificationService,
    ErrorHelpers
  ) {
    var vm = this;
    // TODO: apply better uid generator
    var uid = 'A' + Math.round(Math.random() * 10000);
    var terminal;
    var promises = [new Promise(function (resolve) {
      vm.$onInit = resolve;
    })];
    var $container;
    var geometry = {};
    var presetName = _.get($state, 'current.data.parameters.presetName');

    $scope.$on('$destroy', doDestroy);

    vm.loading = true;

    if (!window.XTerm || !window.XTermAttach) {
      var libPath = APP_CONFIG.resourceUrl + '/public/js/lib/xterm'

      AdpClientCommonHelper.loadCss(libPath + '/css/style.css');
      promises.push(AdpClientCommonHelper.loadScript(libPath + '/index.js'));
    }

    $.when
      .apply(this, promises)
      .then( function() {
        AdpSocketIoService.registerMessageProcessor(websocketHandler);
        emit('init', {presetName: presetName});
      })
      .catch(function (error) {
        ErrorHelpers.handleError(error, 'Unknown error while loading xterm code');
        throw error;
      });

    function doInit() {
      $container = $('#adp-web-terminal-container');

      terminal = new XTerm();
      terminal.onData(sendData);
      terminal.onBinary(sendBinary);
      terminal.open($container[0]);

      $(window).on('resize', calculateTerminalDimensions);
      calculateTerminalDimensions();

      vm.loading = false;
    }

    function doDestroy() {
      emit('destroy');

      $(window).off('resize', calculateTerminalDimensions);

      AdpSocketIoService.unRegisterMessageProcessor(websocketHandler);
    }

    var processors = {
      init: doInit,
      exit: function () {
        AdpNotificationService.notifyError(SERVER_TERMINATE_MESSAGE);
        terminal.write('--- ' + SERVER_TERMINATE_MESSAGE + ' ---\r');
      },
      data: function (data) {
        terminal.write(typeof data === 'string' ? data : new Uint8Array(data));
      },
      connection: function () {
        emit('reconnect')
      },
      error: function( data ) {
        AdpNotificationService.notifyError(data.error);
      }
    }

    function websocketHandler(payload) {
      if (payload.type === 'webTerminal') {
        var cmd = _.get(payload, 'data.cmd');
        var data = _.get(payload, 'data.data');
        var processor = processors[cmd];

        if (processor) {
          processor(data);
        }
      }
    }

    function sendData(data) {
      emit('data', data);
    }

    function sendBinary(data) {
      var buffer = new Uint8Array(data.length);

      for (var i = 0; i < data.length; ++i) {
        buffer[i] = data.charCodeAt(i) & 255;
      }

      emit('data', buffer)
    }

    function calculateTerminalDimensions() {
      var coreDimensions = terminal._core._renderService.dimensions;
      var availableWidth = $container.width();
      var availableHeight = $container.height();
      var cols = Math.max(MINIMUM_COLS, Math.floor(availableWidth / coreDimensions.actualCellWidth));
      var rows = Math.max(MINIMUM_ROWS, Math.floor(availableHeight / coreDimensions.actualCellHeight));

      if (geometry.cols !== cols || geometry.rows !== rows) {
        terminal.resize(cols, rows);

        geometry = {
          cols: cols, rows: rows
        }

        emit('resize', geometry);
      }
    }

    function emit(cmd, data) {
      var payload = {uid: uid, cmd: cmd};

      if (data) {
        payload.data = data
      }

      AdpSocketIoService.emit('message', { type: 'webTerminal', data:payload });
    }
  }
})();
