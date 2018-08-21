module.exports = function () {
  const WebSocketServer = require('ws').Server;
  const log = require('log4js').getLogger('lib/websocket-server');
  let m = {};

  m.connect = (app) => {
    m.webSocketServer = new WebSocketServer({server: app, path: "/ws"});
    m.webSocketServer.on('connection', (ws) => {
      log.trace(`Got new connection: ${ws}`);
      ws
        .on('message', (message) => {
          log.trace('Received WS:', message);
          /*
           try {
           var msg = JSON.parse(message);
           if (msg.kind == "System") {
           console.log("Rebroadcasting message")
           wss.broadcast(message);
           }
           } catch (e) {
           console.log("ERROR:", e);
           }
           */
        })
        .on('open', function open() {
          log.info('connected');
        })
        .on('close', function close() {
          log.info('disconnected');
        })
        .on('ping', function error(err) {
          log.info('ping:', err);
        })
        .send(m.createWebsocketEvent('System', 'ConnectedToServer', {}));
    });
    m.periodicPing = setTimeout(m.pingWebSocketClients, 20000);
  };

  /**
   * This will keep periodically pinging all connected clietns and keep connection alive
   */
  m.pingWebSocketClients = () => {
    log.trace("Pinging all WS clients");
    m.webSocketServer.clients.forEach(function each(client) {
      client.ping("ping");
    });
    setTimeout(m.pingWebSocketClients, 20000);
  };

  /**
   * Creates object to send via Websocket (it only accepts strings)
   * @param kind
   * @param action
   * @param payload
   */
  m.createWebsocketEvent = (kind, action, payload) => {
    return JSON.stringify({
      kind: kind,
      action: action,
      created_at: Date.now,
      parameters: payload
    });
  };

  m.WebSocketBroadcast = (data) => {
    m.webSocketServer.clients.forEach(function each(client) {
      client.send(data);
    });
  };

  return m;
};
