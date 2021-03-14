const { addAuthentication, getSocketIoServer } = require('./common');
const { getEventManager } = require('./event-manager');

module.exports = ({ appLib, socketIoOpts, namespace, log }) => {
  const m = {};

  m.ioServer = null;
  const eventManager = getEventManager(appLib);
  m.addEvent = eventManager.addEvent.bind(eventManager);

  m.build = async (server) => {
    m.ioServer = getSocketIoServer(server, socketIoOpts);
    addAuthentication({ appLib, io: m.ioServer, log });

    m.sendRequest = async (type, data) => {
      const eventSpec = eventManager.eventSpecs[type];
      if (!eventSpec) {
        throw new Error(`Invalid event type '${type}'`);
      }

      try {
        const ioNamespace = m.ioServer.of(namespace);
        const result = await eventSpec.hook.call(ioNamespace, data);
        // emulate same API for repliesHandler i.e. wrapping single response in array
        const replies = [result];
        return eventSpec.repliesHandler(null, replies);
      } catch (e) {
        return eventSpec.repliesHandler(e, null);
      }
    };
  };

  return m;
};
