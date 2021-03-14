const _ = require('lodash');
const log = require('log4js').getLogger('lib/real-time');
const { getFunction } = require('../util/memoize');

async function filterSockets({ appLib, ioNamespace, socketFilter, authFilter, context }) {
  try {
    let socketFilterFunc;
    if (!socketFilter) {
      socketFilterFunc = () => true;
    } else if (_.isFunction(socketFilter)) {
      socketFilterFunc = socketFilter;
    } else {
      socketFilterFunc = getFunction('socket', socketFilter).bind(context);
    }
    const sockets = _.filter(ioNamespace.connected, (socket) => socketFilterFunc(socket));

    let authFilterFunc;
    if (_.isFunction(authFilter)) {
      authFilterFunc = authFilter;
    } else if (_.isString(authFilter)) {
      authFilterFunc = getFunction('auth', authFilter).bind(context);
    }
    if (!authFilterFunc) {
      return sockets;
    }

    const authFilteredSockets = await Promise.map(sockets, async (socket) => {
      try {
        const authData = await appLib.authenticationCheck(socket.request);
        const isPassed = await authFilter(authData);
        return isPassed ? socket : null;
      } catch (e) {
        return null;
      }
    });
    return _.compact(authFilteredSockets);
  } catch (e) {
    return [];
  }
}

function getEventManager(appLib) {
  const eventSpecs = {};
  addDefaultEvents(appLib);

  return { eventSpecs, addEvent };

  function addEvent(eventName, eventHandlers) {
    if (eventSpecs[eventName]) {
      throw new Error(`Event with name '${eventName}' already exists`);
    }
    if (!eventHandlers.hook) {
      throw new Error(`Handler 'hook' must be specified for event`);
    }

    const handlers = _.clone(eventHandlers);
    if (!handlers.repliesHandler) {
      handlers.repliesHandler = function (err, replies) {
        return replies;
      };
    }
    eventSpecs[eventName] = handlers;
  }

  function addDefaultEvents() {
    addEvent('emitToSockets', {
      async hook({ data, socketFilter, authFilter, context }) {
        const ioNamespace = this;
        const sockets = await filterSockets({ appLib, ioNamespace, socketFilter, authFilter, context });
        log.trace(`Emitting ${JSON.stringify(data)} to sockets ${sockets.map((s) => s.id)}`);
        _.each(sockets, (socket) => {
          socket.emit('message', data);
        });
      },
    });
  }
}

module.exports = {
  getEventManager,
};
