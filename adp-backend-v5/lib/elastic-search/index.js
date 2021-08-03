const _ = require('lodash');
const runRealTimeSync = require('./es-mongo-sync/sync-real-time');

function getEsConfig(nodes, maxRetries) {
  return _.isEmpty(nodes) ? undefined : { nodes, maxRetries };
}

function startRealTimeSync(isMongoSupportsSessions, models, mongoUrl, esConfig, enableLog) {
  // Mongo-ElasticSearch connector requires oplog or streams to do sync.
  // Both oplog and streams require mongo to work as replica set.
  if (!isMongoSupportsSessions) {
    throw new Error(
      `Mongo-ElasticSearch connector requires mongo work as replica set.\n` +
        `Replica set is not created, please follow this guide: https://docs.mongodb.com/manual/tutorial/convert-standalone-to-replica-set/ `
    );
  }

  return runRealTimeSync(models, mongoUrl, esConfig, enableLog);
}

module.exports = {
  getEsConfig,
  startRealTimeSync,
};
