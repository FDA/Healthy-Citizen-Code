const Redis = require('ioredis');
const Promise = require('bluebird');
const _ = require('lodash');

Redis.Promise = Promise;
const connectionCache = {};

const defaultOptions = {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => {
    const delays = [25, 50, 100, 200, 400];
    return delays[times - 1] || 5000;
  },
};

function getRedisConnection({ redisUrl, options, log, redisConnectionName = 'Redis', useConnectionCache = false }) {
  const cachedConnection = getConnectionFromCache(redisUrl);
  if (useConnectionCache && cachedConnection) {
    const { connection, name } = cachedConnection;
    log.info(`Reusing connection ${name} by URL ${redisUrl} for ${redisConnectionName}`);
    return connection;
  }

  const opts = _.merge({}, defaultOptions, options);
  const redis = new Redis(redisUrl, opts);
  redis.on('error', (e) => {
    if (e.code !== 'ECONNREFUSED') {
      log.error(`${redisConnectionName} error`, e.stack);
    }
  });
  redis.on('reconnecting', (ms) => {
    log.warn(`${redisConnectionName} reconnecting in ${ms}ms since last try`);
  });

  if (!opts.lazyConnect) {
    addConnectionToCache(redisUrl, redis, redisConnectionName);
    return redis;
  }

  return redis
    .connect()
    .then(() => {
      log.info(`Successfully connected ${redisConnectionName} by URL: ${redisUrl}`);
      addConnectionToCache(redisUrl, redis, redisConnectionName);
      return redis;
    })
    .catch((e) => {
      redis.disconnect();
      throw e;
    });

  function getConnectionFromCache(_redisUrl) {
    return connectionCache[_redisUrl];
  }

  function addConnectionToCache(_redisUrl, _redis, _redisConnectionName) {
    if (!connectionCache[_redisUrl]) {
      connectionCache[_redisUrl] = {
        connection: _redis,
        name: _redisConnectionName,
      };
    }
  }
}

module.exports = {
  getRedisConnection,
};
