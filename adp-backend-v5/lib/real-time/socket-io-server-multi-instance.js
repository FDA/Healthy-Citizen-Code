const _ = require('lodash');
const isCircular = require('is-circular');
const stringifySafe = require('json-stringify-safe');
const redisAdapter = require('socket.io-redis');

const { getRedisConnection } = require('../util/redis');
const { addAuthAndSubscriptions, getSocketIoServer } = require('./common');
const { getActionManager } = require('./action-manager');
const { getSubscriptionManager } = require('./subscription-manager');

module.exports = ({ appLib, socketIoOpts, namespace, redisUrl, keyPrefix, log }) => {
  const m = {};

  m.ioServer = null;

  const actionManager = getActionManager(appLib);
  m.addAction = actionManager.addAction.bind(actionManager);

  const subscriptionManager = getSubscriptionManager(appLib);
  m.addSubscription = subscriptionManager.addSubscription.bind(subscriptionManager);

  m.build = async (server) => {
    try {
      const [pubClient, subClient] = await Promise.all([
        getRedisConnection({ redisUrl, log, redisConnectionName: 'Socket.io_Redis_Pub' }),
        getRedisConnection({ redisUrl, log, redisConnectionName: 'Socket.io_Redis_Sub' }),
      ]);
      m.ioServer = getSocketIoServer(server, socketIoOpts);
      m.ioServer.adapter(redisAdapter({ pubClient, subClient, key: keyPrefix }));
    } catch (e) {
      throw new Error(`Unable to connect Socket.io_Redis by url '${redisUrl}'.`);
    }

    addAuthAndSubscriptions({ appLib, io: m.ioServer, log, subscriptionManager });
    buildCustomHookForActions();
    addPerformAction();
  };

  function buildCustomHookForActions() {
    m.ioServer.of(namespace).adapter.customHook = async function (requestData, cb) {
      const actionType = _.get(requestData, 'type');
      const actionSpec = actionManager.actionSpecs[actionType];
      if (!actionSpec) {
        throw new Error(`Invalid action type '${actionType}'`);
      }

      try {
        const ioNamespace = this.nsp;
        const result = await actionSpec.hook.call(ioNamespace, requestData.data);
        cb(result);
      } catch (e) {
        throw new Error(`Error occurred in customHook for data ${requestData}'`);
      }
    };
  }

  function addPerformAction() {
    m.performAction = async (type, data) => {
      const actionSpec = actionManager.actionSpecs[type];
      if (!actionSpec) {
        throw new Error(`Invalid action type '${type}'`);
      }
      if (isCircular(data)) {
        throw new Error(`Invalid data having circular references sent for performAction with type '${type}': ${stringifySafe(data)}`);
      }

      return new Promise((resolve, reject) => {
        m.ioServer.of(namespace).adapter.customRequest({ type, data }, (err, replies) => {
          try {
            const result = actionSpec.repliesHandler(err, replies);
            resolve(result);
          } catch (e) {
            reject(e);
          }
        });
      });
    };
  }

  return m;
};
