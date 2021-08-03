const { addAuthAndSubscriptions, getSocketIoServer } = require('./common');
const { getActionManager } = require('./action-manager');
const { getSubscriptionManager } = require('./subscription-manager');

module.exports = ({ appLib, socketIoOpts, namespace, log }) => {
  const m = {};

  m.ioServer = null;

  const actionManager = getActionManager(appLib);
  m.addAction = actionManager.addAction.bind(actionManager);

  const subscriptionManager = getSubscriptionManager(appLib);
  m.addSubscription = subscriptionManager.addSubscription.bind(subscriptionManager);

  m.build = async (server) => {
    m.ioServer = getSocketIoServer(server, socketIoOpts);
    addAuthAndSubscriptions({ appLib, io: m.ioServer, log, subscriptionManager });
    addPerformAction();
  };

  function addPerformAction() {
    m.performAction = async (type, data) => {
      const actionSpec = actionManager.actionSpecs[type];
      if (!actionSpec) {
        throw new Error(`Invalid action type '${type}'`);
      }

      try {
        const ioNamespace = m.ioServer.of(namespace);
        const result = await actionSpec.hook.call(ioNamespace, data);
        // emulate same API for repliesHandler as for multi instance i.e. wrap response in array with single element
        const replies = [result];
        return actionSpec.repliesHandler(null, replies);
      } catch (e) {
        return actionSpec.repliesHandler(e, null);
      }
    };
  }

  return m;
};
