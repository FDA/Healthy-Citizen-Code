const _ = require('lodash');

async function filterSockets({ appLib, ioNamespace, socketFilter, authFilter, context }) {
  try {
    let socketFilterFunc;
    if (!socketFilter) {
      socketFilterFunc = () => true;
    } else if (_.isFunction(socketFilter)) {
      socketFilterFunc = socketFilter;
    } else {
      socketFilterFunc = new Function('socket', socketFilter).bind(context);
    }
    const sockets = _.filter(ioNamespace.connected, (socket) => socketFilterFunc(socket));

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
}

function getEventManager(appLib) {
  const eventSpecs = {};

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
        _.each(sockets, (socket) => {
          socket.emit('message', data);
        });
      },
    });
  }

  addDefaultEvents(appLib);
  return { eventSpecs, addEvent };
}

module.exports = {
  getEventManager,
};
