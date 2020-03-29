const log = require('log4js').getLogger('lib/socket.io-server');
const _ = require('lodash');
const socketIoAuth = require('socketio-auth');
const redisAdapter = require('socket.io-redis');
const socketIo = require('socket.io');
const addDeviceToSocketRequest = require('express-device').capture();
const { InvalidTokenError, ExpiredTokenError } = require('../errors');
const { getRedisConnection } = require('../util/redis');

module.exports = (appLib) => {
  const m = {};

  const namespace = '/';
  const operations = {};
  let ioServer = null;

  m.addOperation = (operationName, operationHandlers) => {
    if (operations[operationName]) {
      throw new Error(`Operation with name '${operationName}' already exists`);
    }
    if (!operationHandlers.hook) {
      throw new Error(`Handler 'hook' must be specified`);
    }

    const handlers = _.clone(operationHandlers);
    if (!handlers.repliesHandler) {
      handlers.repliesHandler = function (err, replies) {
        return replies;
      };
    }
    operations[operationName] = handlers;
  };
  m.filterSockets = async function ({ io, socketFilter, authFilter, context }) {
    try {
      let socketFilterFunc;
      if (!socketFilter) {
        socketFilterFunc = () => true;
      } else if (_.isFunction(socketFilter)) {
        socketFilterFunc = socketFilter;
      } else {
        socketFilterFunc = new Function('socket', socketFilter).bind(context);
      }
      const sockets = _.filter(io.nsp.connected, (socket) => socketFilterFunc(socket));

      let authFilterFunc;
      if (_.isFunction(authFilter)) {
        authFilterFunc = authFilter;
      } else if (_.isString(authFilter)) {
        authFilterFunc = new Function('auth', authFilter).bind(context);
      }
      if (!authFilterFunc) {
        return sockets;
      }
      const authFilteredSockets = await Promise.map(sockets, async (socket) => {
        try {
          const auth = await appLib.authenticationCheck(socket.request);
          const isPassed = await authFilter(auth);
          return isPassed ? socket : null;
        } catch (e) {
          return null;
        }
      });
      return _.compact(authFilteredSockets);
    } catch (e) {
      return [];
    }
  };
  async function sendRequest(type, data) {
    const operation = operations[type];
    if (!operation) {
      throw new Error(`Invalid operation type '${type}'`);
    }

    return new Promise((resolve, reject) => {
      ioServer.of(namespace).adapter.customRequest({ type, data }, function (err, replies) {
        try {
          const result = operation.repliesHandler(err, replies);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  m.build = async ({ server, redisUrl, keyPrefix }) => {
    if (!redisUrl) {
      m.sendRequest = () => {};
      log.warn(
        `Redis url for socket.io server is not specified, app will continue working without real-time communication.`
      );
      return;
    }

    try {
      const [pubClient, subClient] = await Promise.all([
        getRedisConnection({ redisUrl, log, redisConnectionName: 'Socket.io_Redis_Pub' }),
        getRedisConnection({ redisUrl, log, redisConnectionName: 'Socket.io_Redis_Sub' }),
      ]);
      ioServer = socketIo(server, {
        handlePreflightRequest: (req, res) => {
          // check whether req.headers.origin is passed cors
          res.writeHead(200, {
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Origin': req.headers.origin,
            'Access-Control-Allow-Credentials': true,
          });
          res.end();
        },
      });
      ioServer.adapter(redisAdapter({ pubClient, subClient, key: keyPrefix }));
    } catch (e) {
      throw new Error(`Unable to connect Socket.io_Redis by url '${redisUrl}'.`);
    }

    addAuthentication();
    buildCustomHookForOperations();
    m.sendRequest = sendRequest;

    function addAuthentication() {
      ioServer.on('connection', () => {
        socketIoAuth(ioServer, {
          authenticate: async (socket, data, cb) => {
            try {
              addDeviceToSocketRequest(socket.request);
              const { user } = await appLib.authenticationCheck(socket.request);
              socket.userId = user._id.toString();
              return cb(null, true);
            } catch (e) {
              if (e instanceof InvalidTokenError) {
                return cb({ message: 'Invalid user session, please login' });
              }
              if (e instanceof ExpiredTokenError) {
                return cb({ message: 'User session expired, please login again' });
              }
              log.error(e.stack);
              return cb({ message: `Error occurred during authentication process` });
            }
          },
        });
      });
    }
    function buildCustomHookForOperations() {
      ioServer.of(namespace).adapter.customHook = async function (requestData, cb) {
        const operationType = _.get(requestData, 'type');
        const operation = operations[operationType];
        if (!operation) {
          throw new Error(`Invalid operation type '${operationType}'`);
        }

        try {
          const result = await operation.hook.call(this, requestData.data);
          cb(result);
        } catch (e) {
          throw new Error(`Error occurred in customHook for data ${requestData}'`);
        }
      };
    }
  };

  addDefaultOperations();
  function addDefaultOperations() {
    m.addOperation('emitToSockets', {
      async hook({ data, socketFilter, authFilter, context }) {
        const io = this;
        const sockets = await m.filterSockets({ io, socketFilter, authFilter, context });
        _.each(sockets, (socket) => {
          socket.emit('message', data);
        });
      },
    });
  }

  return m;
};
