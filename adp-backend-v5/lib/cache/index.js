const Redis = require('ioredis');
const Promise = require('bluebird');

Redis.Promise = Promise;
const log = require('log4js').getLogger('lib/cache');
const { CacheHit } = require('../errors');

module.exports = () => {
  const m = {};
  let cache = null;

  m.init = redisUrl =>
    m.getCacheStorage(redisUrl).then(cacheStorage => {
      cache = cacheStorage;
    });

  m.getCacheStorage = redisUrl => {
    if (!redisUrl) {
      return Promise.resolve(null);
    }
    const redis = new Redis(redisUrl, { lazyConnect: true });
    redis.on('error', error => {
      console.log('Redis connection error', error);
    });
    return redis
      .connect()
      .then(() => {
        log.info(`Successfully connected to redis by URL: ${redisUrl}`);
        return redis;
      })
      .catch(() => {
        // without disconnecting redis will keep trying to connect
        redis.disconnect();
        log.info(
          `Unable to connect to redis by URL: ${redisUrl}. Server will continue working without cache.`
        );
        return null;
      });
  };

  m.setCache = (key, value) => {
    if (!cache) {
      return;
    }

    return cache.set(key, JSON.stringify(value)).catch(err => {
      log.error(`Unable to set value into cache by key: '${key}'. Value: ${value}`, err);
    });
  };

  m.getCache = key => {
    if (!cache || !key) {
      return Promise.resolve(null);
    }
    return cache
      .get(key)
      .then(value => {
        try {
          return JSON.parse(value);
        } catch (e) {
          log.info(`Cannot parse value from cache by key: '${key}'. Value: ${value}`);
          return null;
        }
      })
      .catch(err => {
        log.error(`Unable to get value from cache by key: '${key}'.`, err);
        return cache.get(key);
      });
  };

  m.clearCacheByKeyPattern = keyPattern => {
    if (!cache || !keyPattern) {
      return Promise.resolve(null);
    }
    const stream = cache.scanStream({ match: keyPattern });
    const unlinkPromises = [];

    return new Promise(resolve => {
      stream.on('data', keys => {
        // `keys` is an array of strings representing key names
        if (keys.length) {
          unlinkPromises.push(cache.unlink(keys));
        }
      });
      stream.on('end', () => {
        resolve(Promise.all(unlinkPromises));
      });
    });
  };

  m.clearCacheForModel = modelName => m.clearCacheByKeyPattern(`${modelName}:*`);

  m.keys = {
    ROLES_TO_PERMISSIONS: 'rolesToPermissions',
  };

  m.getUsingCache = (getPromise, cacheKey) =>
    m
      .getCache(cacheKey)
      .then(cacheData => {
        if (cacheData) {
          throw new CacheHit(`Cache hit for key ${cacheKey}`, cacheData);
        }
        return getPromise();
      })
      .then(data => Promise.all([data, m.setCache(cacheKey, data)]))
      .then(([data]) => data)
      .catch(CacheHit, obj => {
        const cacheData = obj.data;
        return cacheData;
      });

  return m;
};
