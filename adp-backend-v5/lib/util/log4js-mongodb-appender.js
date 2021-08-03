const _ = require('lodash');
const { mongoConnect } = require('./mongo');

/**
 * Returns a function to log data in mongodb.
 *
 * @param {Object} options The configuration object.
 * @param {string} options.connectionString The connection string to the mongo db.
 * @param {string=} options.layout The log4js layout.
 * @param {string=} options.insert The insert mode.
 * @returns {Function}
 */
// TODO: add handling session inside logEvent `logger.info('Hello', { context: { session } });`
// TODO: adopt our own message format

function getInsertOptions(options) {
  // allow start with '$' or include '.' in any key value for log documents
  const insertOptions = { w: 0, checkKeys: false };

  if (options.write === 'normal') {
    insertOptions.w = 1;
  }

  if (options.write === 'safe') {
    insertOptions.w = 1;
    insertOptions.journal = true;
  }

  return insertOptions;
}

function insert(collection, data, insertOptions) {
  return collection.insertOne(data, insertOptions);
}

function insertWithErrorCallback(collection, data, insertOptions) {
  return collection.insertOne(data, insertOptions, (error) => {
    if (error) {
      console.error('log: Error writing data to log!', error);
    }
  });
}

module.exports = (options = {}) => {
  const { connectionString, collectionName } = options;
  if (!connectionString) {
    throw new Error(`Param 'connectionString' or 'db' must be presented`);
  }
  // check connection string
  if (_.isString(connectionString) && !connectionString.startsWith('mongodb://')) {
    options.connectionString = `mongodb://${connectionString}`;
  }

  let collection;
  // Disable 'promise/catch-or-return' rule since log4js configuration is always set once therefore making this function async forbids using log4js before promise is resolved
  // eslint-disable-next-line promise/catch-or-return
  mongoConnect(connectionString).then(({ db }) => {
    collection = db.collection(collectionName);
  });

  const insertOptions = getInsertOptions(options);
  const insertData = insertOptions.w === 0 ? insert : insertWithErrorCallback;

  return {
    configure() {
      return (loggingEvent) => {
        const data = loggingEvent.data[0];
        insertData(collection, data, insertOptions);
      };
    },
  };
};
