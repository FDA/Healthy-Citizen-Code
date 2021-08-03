const Promise = require('bluebird');
const log = require('log4js').getLogger('lib/cache');
const { getCacheStorage } = require('./cacheStorage');
const { getRedisPrefix } = require('../util/redis');

module.exports = (options) => {
  const m = {};
  m.cacheStorage = null;

  m.init = async () => {
    const { keyPrefix, redisUrl } = options;
    m.keyPrefix = getRedisPrefix(keyPrefix);
    m.cacheStorage = await getCacheStorage(redisUrl, log);
  };

  m.getKeyWithPrefix = (key) => `${m.keyPrefix}${key}`;

  m.isReady = () =>
    // RedisMock has field 'status', but has not field 'connected'
    m.cacheStorage && (m.cacheStorage.status === 'ready' || m.cacheStorage.connected);

  m.set = async (key, value) => {
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

  m.setex = async (key, value, expireInMs) => {
    if (!m.isReady()) {
      return false;
    }

    const keyWithPrefix = m.getKeyWithPrefix(key);
    try {
      await m.cacheStorage.setex(keyWithPrefix, expireInMs, JSON.stringify(value));
      return true;
    } catch (e) {
      log.error(`Unable to setex value into cache by key: '${keyWithPrefix}'. Value: ${value}`, e.stack);
      throw e;
    }
  };

  m.get = async (key) => {
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

  m.unlink = async (key) => {
    if (!m.isReady() || !key) {
      return null;
    }

    const keyWithPrefix = m.getKeyWithPrefix(key);
    try {
      await m.cacheStorage.unlink(keyWithPrefix);
    } catch (e) {
      log.error(`Unable to unlink cache by key: '${keyWithPrefix}'.`, e.stack);
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

    const keyWithPrefix = m.getKeyWithPrefix(keyPattern);
    try {
      const stream = m.cacheStorage.scanStream({ match: keyWithPrefix });
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
          log.info(`Cleared cache by keyPattern '${keyWithPrefix}'`);
          resolve();
        });
      });
    } catch (e) {
      log.error(`Unable to clear cache by keyPattern: '${keyWithPrefix}'.`, e.stack);
    }
  };

  m.clearCacheForModel = (modelName) => m.clearCacheByKeyPattern(`${modelName}:*`);

  m.keys = {
    usersWithPermissions(permissions) {
      if (!permissions) {
        return 'usersWithPermissions';
      }
      const sortedPermissions = [...permissions].sort();
      return `usersWithPermissions:${sortedPermissions.join(',')}`;
    },
    rolesToPermissions() {
      return 'rolesToPermissions';
    },
  };

  m.getUsingCache = async (getPromise, key) => {
    const cacheData = await m.get(key);
    if (cacheData) {
      log.debug(`Retrieved value from cache by key: ${key}`);
      return cacheData;
    }

    const data = await getPromise();
    try {
      const isSet = await m.set(key, data);
      isSet && log.debug(`Set value in cache by key: ${key}`);
    } catch (e) {
      //
    }
    return data;
  };

  return m;
};
