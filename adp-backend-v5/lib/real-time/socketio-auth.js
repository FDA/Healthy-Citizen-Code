const _ = require('lodash');

/**
 * Adds connection listeners to the given socket.io server, so clients
 * are forced to authenticate before they can receive events.
 *
 * @param {Object} io - the socket.io server socket
 *
 * @param {Object} config - configuration values
 * @param {Function} config.authenticate - indicates if authentication was successfull
 * @param {Function} config.postAuthenticate=noop -  called after the client is authenticated
 * @param {Function} config.disconnect=noop -  called after the client is disconnected
 * @param {Number} [config.timeout=1000] - amount of milliseconds to wait for a client to
 * authenticate before disconnecting it. A value of 'none' means no connection timeout.
 */
module.exports = (io, config = {}) => {
  const timeout = config.timeout || 1000;
  const postAuthenticate = config.postAuthenticate || _.noop;
  const disconnect = config.disconnect || _.noop;
  const debug = config.debug || _.noop;

  _.each(io.nsps, (nsp) => forbidConnections(nsp, debug));
  io.on('connection', function (socket) {
    socket.auth = false;

    config.authenticate(socket, function (err, success) {
      if (success) {
        debug(`Authenticated socket ${socket.id}`);
        socket.auth = true;

        _.each(io.nsps, function (nsp) {
          restoreConnection(nsp, socket, debug);
        });

        socket.emit('authenticated', success);
        return postAuthenticate(socket);
      }
      if (err) {
        debug(`Authentication error socket ${socket.id}: ${err.message}`);
        return socket.emit('unauthorized', { message: err.message }, function () {
          socket.disconnect();
        });
      }
      debug('Authentication failure socket %s', socket.id);
      socket.emit('unauthorized', { message: 'Authentication failure' }, function () {
        socket.disconnect();
      });
    });

    socket.on('disconnect', function () {
      return disconnect(socket);
    });

    if (timeout !== 'none') {
      setTimeout(function () {
        // If the socket didn't authenticate after connection, disconnect it
        if (!socket.auth) {
          debug(`Disconnecting socket ${socket.id}`);
          socket.disconnect('unauthorized');
        }
      }, timeout);
    }
  });
};

/**
 * Set a listener so connections from unauthenticated sockets are not
 * considered when emitting to the namespace. The connections will be
 * restored after authentication succeeds.
 */
function forbidConnections(nsp, debug) {
  nsp.on('connect', function (socket) {
    if (!socket.auth) {
      delete nsp.connected[socket.id];
      debug(`Removed socket ${socket.id} from namespace '${nsp.name}'`);
    }
  });
}

/**
 * If the socket attempted a connection before authentication, restore it.
 */
function restoreConnection(nsp, socket, debug) {
  if (_.find(nsp.sockets, { id: socket.id })) {
    nsp.connected[socket.id] = socket;
    debug(`Restored socket ${socket.id} to namespace '${nsp.name}'`);
  }
}
