const _ = require('lodash');
const log = require('log4js').getLogger('lib/real-time');
const { getFunction } = require('../util/memoize');

/**
 * Action manager adds ability to add actions which can retrieve any information from sockets.
 * Action manager is created to adopt socket.io-redis's approach to communicate with multiple nodes - https://github.com/socketio/socket.io-redis/tree/4.0.1#redisadaptercustomrequestdataobject-fnfunction
 * Each action must contain
 * - *hook* handler called with Function.call with args (ioNamespace, payload: { type, data }) and used in customHook
 * - optional *repliesHandler* called with Function.call with args (err, replies) and used in customRequest
 * @param appLib
 * @returns {{addAction: addAction, actionSpecs: {}}}
 */
function getActionManager(appLib) {
  const actionSpecs = {};
  addDefaultActions(appLib);

  return { actionSpecs, addAction };

  function addAction(actionName, actionHandlers) {
    if (actionSpecs[actionName]) {
      throw new Error(`Action with name '${actionName}' already exists`);
    }
    if (!actionHandlers.hook) {
      throw new Error(`Handler 'hook' must be specified for action`);
    }

    const handlers = _.clone(actionHandlers);
    if (!handlers.repliesHandler) {
      handlers.repliesHandler = function (err, replies) {
        return replies;
      };
    }
    actionSpecs[actionName] = handlers;
  }

  function addDefaultActions() {
    addAction('emitToSockets', {
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
        const authData = await appLib.auth.authenticationCheck(socket.request);
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

module.exports = {
  getActionManager,
};
