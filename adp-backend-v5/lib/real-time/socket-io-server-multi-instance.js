const _ = require('lodash');
const redisAdapter = require('socket.io-redis');

const { getRedisConnection } = require('../util/redis');
const { addAuthentication, getSocketIoServer } = require('./common');
const { getEventManager } = require('./event-manager');

module.exports = ({ appLib, namespace, redisUrl, keyPrefix, log }) => {
  const m = {};

  let ioServer = null;
  let eventManager = null;

  m.build = async (server) => {
    try {
      const [pubClient, subClient] = await Promise.all([
        getRedisConnection({ redisUrl, log, redisConnectionName: 'Socket.io_Redis_Pub' }),
        getRedisConnection({ redisUrl, log, redisConnectionName: 'Socket.io_Redis_Sub' }),
      ]);
      ioServer = getSocketIoServer(server);
      ioServer.adapter(redisAdapter({ pubClient, subClient, key: keyPrefix }));
    } catch (e) {
      throw new Error(`Unable to connect Socket.io_Redis by url '${redisUrl}'.`);
    }

    addAuthentication({ appLib, io: ioServer, log });

    eventManager = getEventManager(appLib);
    m.addEvent = eventManager.addEvent;
    const { eventSpecs } = eventManager;

    buildCustomHookForEvents();
    m.sendRequest = sendRequest;

    function buildCustomHookForEvents() {
      ioServer.of(namespace).adapter.customHook = async function (requestData, cb) {
        const eventType = _.get(requestData, 'type');
        const eventSpec = eventSpecs[eventType];
        if (!eventSpec) {
          throw new Error(`Invalid event type '${eventType}'`);
        }

        try {
          const ioNamespace = this.nsp;
          const result = await eventSpec.hook.call(ioNamespace, requestData.data);
          cb(result);
        } catch (e) {
          throw new Error(`Error occurred in customHook for data ${requestData}'`);
        }
      };
    }
    async function sendRequest(type, data) {
      const eventSpec = eventSpecs[type];
      if (!eventSpec) {
        throw new Error(`Invalid event type '${type}'`);
      }

      return new Promise((resolve, reject) => {
        ioServer.of(namespace).adapter.customRequest({ type, data }, function (err, replies) {
          try {
            const result = eventSpec.repliesHandler(err, replies);
            resolve(result);
          } catch (e) {
            reject(e);
          }
        });
      });
    }
  };

  return m;
};
