const { MongoClient } = require('mongodb');
const _ = require('lodash');

const SEC = 1000;
const WEEK = 7 * 24 * 60 * 60 * SEC;
const connectionOptions = {
  // reconnectTries: 60,
  // reconnectInterval: SEC,
  connectTimeoutMS: WEEK,
  socketTimeoutMS: WEEK,
  ignoreUndefined: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

async function mongoConnect(url, conOptions = connectionOptions, dbOptions) {
  const connection = await MongoClient.connect(url, conOptions);
  const db = connection.db(connection.s.options.dbName, dbOptions);
  db.close = connection.close.bind(connection);
  return { db, connection };
}

function getOptionsToLog(options) {
  const hasClientSession = _.get(options, 'session.constructor.name') === 'ClientSession';
  if (!hasClientSession) {
    return options;
  }
  const clonedOptions = _.cloneDeep(options);
  delete clonedOptions.session;
  return clonedOptions;
}

module.exports = {
  connectionOptions,
  mongoConnect,
  getOptionsToLog,
};
