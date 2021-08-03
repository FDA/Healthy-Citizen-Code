const { getRedisConnection } = require('../util/redis');

function getCacheStorage(redisUrl, log, redisConnectionName = 'Cache_Redis') {
  if (!redisUrl) {
    return null;
  }

  try {
    return getRedisConnection({ redisUrl, log, redisConnectionName });
  } catch (e) {
    log.warn(
      `Unable to connect ${redisConnectionName} by URL: ${redisUrl}. Server will continue working without cache`,
      e.stack
    );
    return null;
  }
}

module.exports = {
  getCacheStorage,
};
