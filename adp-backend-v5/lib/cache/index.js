const Redis = require('ioredis');
const Promise = require('bluebird');

Redis.Promise = Promise;
const log = require('log4js').getLogger('lib/cache');

module.exports = options => {
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

  m.getKeyWithPrefix = key => `${m.keyPrefix}${key}`;

  m.getCacheStorage = async url => {
    if (!url) {
      return null;
    }

    const redis = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: times => {
        const delays = [25, 50, 100, 200, 400];
        return delays[times - 1] || 5000;
      },
    });
    redis.on('error', e => {
      if (e.code !== 'ECONNREFUSED') {
        log.error(`Redis error`, e.stack);
      }
    });
    redis.on('ready', () => {
      log.info(`Redis is ready to receive commands`);
    });
    redis.on('reconnecting', ms => {
      log.warn(`Redis reconnecting in ${ms}ms since last try`);
    });

    try {
      await redis.connect();
      log.info(`Successfully connected to redis by URL: ${url}`);
      return redis;
    } catch (e) {
      // without disconnecting redis will keep trying to connect
      redis.disconnect();
      log.warn(`Unable to connect to redis by URL: ${url}. Server will continue working without cache.`, e.stack);
      return null;
    }
  };

  m.isCacheReady = () => {
    // RedisMock has field 'status', but has field cache.connected
    return m.cacheStorage && (m.cacheStorage.status === 'ready' || m.cacheStorage.connected);
  };

  m.setCache = async (key, value) => {
    if (!m.isCacheReady()) {
      return;
    }

    const keyWithPrefix = m.getKeyWithPrefix(key);
    try {
      await m.cacheStorage.set(keyWithPrefix, JSON.stringify(value));
    } catch (e) {
      log.error(`Unable to set value into cache by key: '${keyWithPrefix}'. Value: ${value}`, e.stack);
      throw e;
    }
  };

  m.getCache = async key => {
    if (!m.isCacheReady() || !key) {
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

  m.getKeys = async keyPattern => {
    if (!m.isCacheReady() || !keyPattern) {
      return null;
    }
    const allKeys = [];
    const stream = m.cacheStorage.scanStream({ match: m.getKeyWithPrefix(keyPattern) });

    return new Promise(resolve => {
      stream.on('data', keys => {
        allKeys.push(...keys);
      });
      stream.on('end', () => {
        resolve(allKeys);
      });
    });
  };

  m.clearCacheByKeyPattern = async keyPattern => {
    if (!m.isCacheReady() || !keyPattern) {
      return null;
    }
    try {
      const stream = m.cacheStorage.scanStream({ match: m.getKeyWithPrefix(keyPattern) });
      const unlinkPromises = [];

      return new Promise(resolve => {
        stream.on('data', keys => {
          // `keys` is an array of strings representing key names
          if (keys.length) {
            unlinkPromises.push(m.cacheStorage.unlink(keys));
          }
        });
        stream.on('end', () => {
          resolve(Promise.all(unlinkPromises));
        });
      });
    } catch (e) {
      log.error(`Unable to clear cache by keyPattern: '${keyPattern}'.`, e.stack);
    }
  };

  m.clearCacheForModel = modelName => m.clearCacheByKeyPattern(`${modelName}:*`);

  m.keys = {
    ROLES_TO_PERMISSIONS: 'rolesToPermissions',
  };

  m.getUsingCache = async (getPromise, key) => {
    const cacheData = await m.getCache(key);
    if (cacheData) {
      log.debug(`Retrieved value from cache by key: ${key}`);
      return cacheData;
    }

    const data = await getPromise();
    try {
      await m.setCache(key, data);
      log.debug(`Set value in cache by key: ${key}`);
    } catch (e) {
      //
    }
    return data;
  };

  return m;
};
