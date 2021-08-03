const log = require('log4js').getLogger('lib/socket.io-server');

module.exports = ({ appLib, redisUrl, keyPrefix }) => {
  const namespace = '/';

  const socketIoOpts = {
    path: `${appLib.config.API_PREFIX}/socket.io`,
  };
  if (!redisUrl || !keyPrefix) {
    const realTimeServer = require('./socket-io-server-single-instance')({ appLib, socketIoOpts, namespace, log });
    log.warn(
      `Params redisUrl and keyPrefix for real-time server are not specified. Real-time communication will work in single-instance mode.`
    );
    return realTimeServer;
  }

  const realTimeServer = require('./socket-io-server-multi-instance')({
    appLib,
    socketIoOpts,
    namespace,
    redisUrl,
    keyPrefix,
    log,
  });
  log.info(`Real-time communication will work in multi-instance mode.`);
  return realTimeServer;
};
