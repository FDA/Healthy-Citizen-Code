const Promise = require('bluebird');
const log = require('log4js').getLogger('lib/cache');

const { getRedisConnection } = require('../util/redis');

module.exports = (options) => {
  const m = {};
  m.cacheStorage = null;

  m.init = async () => {
    const { keyPrefix, redisUrl } = options;
    m.keyPrefix = getKeyPrefix(keyPrefix);
    m.cacheStorage = await m.getCacheStorage(redisUrl);
  };

  function getKeyPrefix(prefix) {
    if (!prefix) {
      return '';
    }
    return prefix.endsWith(':') ? prefix : `${prefix}:`;
  }

  m.getKeyWithPrefix = (key) => `${m.keyPrefix}${key}`;

  m.getCacheStorage = (redisUrl) => {
    if (!redisUrl) {
      return null;
    }

    const redisConnectionName = 'Cache_Redis';
    try {
      return getRedisConnection({ redisUrl, log, redisConnectionName });
    } catch (e) {
      log.warn(
        `Unable to connect ${redisConnectionName} by URL: ${redisUrl}. Server will continue working without cache`,
        e.stack
      );
      return null;
    }
  };

  m.isReady = () => {
    // RedisMock has field 'status', but has field cache.connected
    return m.cacheStorage && (m.cacheStorage.status === 'ready' || m.cacheStorage.connected);
  };

  /**
   *
   * @param key
   * @param value
   * @returns {Promise<boolean>}
   */
  m.setCache = async (key, value) => {
    if (!m.isReady()) {
      return false;
    }

    const keyWithPrefix = m.getKeyWithPrefix(key);
    try {
      await m.cacheStorage.set(keyWithPrefix, JSON.stringify(value));
      return true;
    } catch (e) {
      log.error(`Unable to set value into cache by key: '${keyWithPrefix}'. Value: ${value}`, e.stack);
      throw e;
    }
  };

  m.getCache = async (key) => {
    if (!m.isReady() || !key) {
      return null;
    }

    const keyWithPrefix = m.getKeyWithPrefix(key);
    try {
      const value = await m.cacheStorage.get(keyWithPrefix);
      try {
        return JSON.parse(value);
      } catch (e) {
        log.info(`Cannot parse value from cache by key: '${keyWithPrefix}'. Value: ${value}`);
        return null;
      }
    } catch (e) {
      log.error(`Unable to get value from cache by key: '${keyWithPrefix}'.`, e.stack);
      return null;
    }
  };

  m.getKeys = async (keyPattern) => {
    if (!m.isReady() || !keyPattern) {
      return null;
    }
    const allKeys = [];
    const stream = m.cacheStorage.scanStream({ match: m.getKeyWithPrefix(keyPattern) });

    return new Promise((resolve) => {
      stream.on('data', (keys) => {
        allKeys.push(...keys);
      });
      stream.on('end', () => {
        resolve(allKeys);
      });
    });
  };

  m.clearCacheByKeyPattern = async (keyPattern) => {
    if (!m.isReady() || !keyPattern) {
      return null;
    }
    try {
      const stream = m.cacheStorage.scanStream({ match: m.getKeyWithPrefix(keyPattern) });
      const unlinkPromises = [];

      return new Promise((resolve) => {
        stream.on('data', (keys) => {
          // `keys` is an array of strings representing key names
          if (keys.length) {
            unlinkPromises.push(m.cacheStorage.unlink(keys));
          }
        });
        stream.on('end', async () => {
          await Promise.all(unlinkPromises);
          log.info(`Cleared cache by keyPattern '${keyPattern}'`);
          resolve();
        });
      });
    } catch (e) {
      log.error(`Unable to clear cache by keyPattern: '${keyPattern}'.`, e.stack);
    }
  };

  m.clearCacheForModel = (modelName) => m.clearCacheByKeyPattern(`${modelName}:*`);

  m.keys = {
    usersWithPermissions(permissions) {
      const sortedPermissions = [...permissions].sort();
      return `usersWithPermissions:${sortedPermissions.join(',')}`;
    },
    rolesToPermissions() {
      return 'rolesToPermissions';
    },
  };

  m.getUsingCache = async (getPromise, key) => {
    const cacheData = await m.getCache(key);
    if (cacheData) {
      log.debug(`Retrieved value from cache by key: ${key}`);
      return cacheData;
    }

    const data = await getPromise();
    try {
      const isSet = await m.setCache(key, data);
      isSet && log.debug(`Set value in cache by key: ${key}`);
    } catch (e) {
      //
    }
    return data;
  };

  return m;
};
