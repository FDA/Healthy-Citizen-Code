const _ = require('lodash');
const ms = require('ms');
const dayjs = require('dayjs');
const mem = require('mem');

function getFileLinkStorage(cache, fileLinkExpiresIn) {
  if (cache && cache.isReady()) {
    return getCacheStorage(fileLinkExpiresIn, cache);
  }
  return getInMemoryStorage(fileLinkExpiresIn);
}

function getCacheStorage(fileLinkExpiresIn, cache) {
  const getLinkKey = (userLinkId, linkId) => `fileLinks_${userLinkId}:${linkId}`;
  return {
    add: async (userLinkId, linkId, value) => {
      const val = { ...value, expiresAt: dayjs().add(fileLinkExpiresIn, 'ms').toDate() };
      await cache.setex(getLinkKey(userLinkId, linkId), val, fileLinkExpiresIn);
      return val;
    },
    get: (userLinkId, linkId) => cache.get(getLinkKey(userLinkId, linkId)),
  };
}

function getInMemoryStorage(fileLinkExpiresIn) {
  const storage = Object.create(null);

  function _clearExpiredFileLinks(userLinkId) {
    const now = new Date();
    _.each(storage[userLinkId], (fileInfo, fileId) => {
      if (fileInfo && new Date(fileInfo.expiresAt) < now) {
        delete storage[userLinkId][fileId];
      }
    });
  }
  const clearExpiredFileLinks = mem(_clearExpiredFileLinks, {
    cacheKey: ([userLinkId]) => userLinkId,
    maxAge: ms('1m'),
  });

  return {
    add: (userLinkId, linkId, value) => {
      const val = { ...value, expiresAt: dayjs().add(fileLinkExpiresIn, 'ms').toDate() };
      _.set(storage, [userLinkId, linkId], val);
      return val;
    },
    get: (userLinkId, linkId) => {
      clearExpiredFileLinks(userLinkId);
      const value = _.get(storage, [userLinkId, linkId], {});
      if (value.expiresAt > new Date()) {
        return value;
      }
      _.unset(storage, [userLinkId, linkId]);
      return null;
    },
  };
}

module.exports = {
  getFileLinkStorage,
};
