const { addAuthentication, getSocketIoServer } = require('./common');
const { getEventManager } = require('./event-manager');

module.exports = ({ appLib, namespace, log }) => {
  const m = {};

  let ioServer = null;
  let eventManager = null;

  m.build = async (server) => {
    ioServer = getSocketIoServer(server);
    addAuthentication({ appLib, io: ioServer, log });

    eventManager = getEventManager(appLib);
    m.addEvent = eventManager.addEvent;
    const { eventSpecs } = eventManager;

    m.sendRequest = sendRequest;

    async function sendRequest(type, data) {
      const eventSpec = eventSpecs[type];
      if (!eventSpec) {
        throw new Error(`Invalid event type '${type}'`);
      }

      try {
        const ioNamespace = ioServer.of(namespace);
        const result = await eventSpec.hook.call(ioNamespace, data);
        // emulate same API for repliesHandler i.e. wrapping single response in array
        const replies = [result];
        return eventSpec.repliesHandler(null, replies);
      } catch (e) {
        return eventSpec.repliesHandler(e, null);
      }
    }
  };

  return m;
};
