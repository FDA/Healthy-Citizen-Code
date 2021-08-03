const _ = require('lodash');
const Promise = require('bluebird');

const { mongoConnect } = require('../../../util/mongo');

function ConnectionManager() {
  const cache = {};
  return {
    async getConnection(mongoUrl) {
      if (cache[mongoUrl]) {
        return cache[mongoUrl];
      }
      if (!mongoUrl) {
        cache[mongoUrl] = null;
        throw new Error(`Mongo url is not specified`);
      }

      try {
        const connection = await mongoConnect(mongoUrl);
        cache[mongoUrl] = connection;
        return connection;
      } catch (e) {
        cache[mongoUrl] = null;
        throw new Error(`Cannot connect to ${mongoUrl}. ${e.stack}`);
      }
    },
    clearConnections() {
      const promises = [];
      _.each(cache, connection => {
        promises.push(connection.close());
      });
      return Promise.all(promises);
    },
  };
}

module.exports = ConnectionManager;
