const { MongoClient } = require('mongodb');
const _ = require('lodash');
const { stringifyLog } = require('./util');

const connectionOptions = {
  ignoreUndefined: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

async function mongoConnect(url, options = {}) {
  const { conOptions = connectionOptions, dbOptions, log } = options;
  const connection = await MongoClient.connect(url, conOptions);

  if (log) {
    const topologyLog = (...args) => {
      const [eventName, eventObj] = args;
      log.info(`Topology event '${eventName}'`, eventObj);
    };

    connection.topology.on('serverClosed', (event) => topologyLog(`serverClosed`, stringifyLog(event, 2)));
    connection.topology.on('topologyClosed', (event) => topologyLog(`topologyClosed`, stringifyLog(event, 2)));
    connection.topology.on('serverHeartbeatFailed', (event) =>
      topologyLog(`serverHeartbeatFailed`, stringifyLog(event, 2))
    );
    connection.topology.on('serverDescriptionChanged', (event) =>
      topologyLog(`serverDescriptionChanged`, stringifyLog(event, 2))
    );
    connection.topology.on('topologyDescriptionChanged', (event) => {
      const _event = _.cloneDeep(event);
      _event.previousDescription.servers = [..._event.previousDescription.servers];
      _event.newDescription.servers = [..._event.newDescription.servers];
      topologyLog(`topologyDescriptionChanged`, stringifyLog(_event, 2));
    });
  }

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
