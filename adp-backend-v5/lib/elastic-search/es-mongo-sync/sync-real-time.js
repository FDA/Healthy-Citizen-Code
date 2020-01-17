const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const tomlify = require('tomlify');
const { spawn } = require('child_process');
const log = require('log4js').getLogger('es-mongo-sync/sync-real-time');
const { checkIsMonstacheCorrect } = require('./util');

const changeStreamCfgPath = path.join(__dirname, 'monstache_config', 'change_stream_config.toml');

function runChangeStreamConfig(configPath, enableLog) {
  const proc = spawn('monstache', ['-f', configPath]);
  if (enableLog) {
    proc.stdout.on('data', data => {
      log.info(data.toString());
    });
    proc.stderr.on('data', data => {
      log.error(data.toString());
    });
  }
}

function generateTomlForChangeStream(mongoUrlWithoutDbName, dbName, esConfig, collectionNames) {
  const { nodes, maxRetries } = esConfig;

  return tomlify(
    {
      'elasticsearch-urls': nodes,
      'mongo-url': mongoUrlWithoutDbName,
      'change-stream-namespaces': collectionNames.map(c => `${dbName}.${c}`),
      gzip: true,
      stats: true,
      'index-stats': true,
      'elasticsearch-max-conns': maxRetries || 4,
      'dropped-collections': true,
      'dropped-databases': true,
      replay: false,
      resume: true,
      'resume-write-unsafe': false,
      'resume-name': 'default',
      verbose: true,
      'cluster-name': 'cluster',
    },
    { space: 2 }
  );
}

async function startRealTimeSync(models, mongoUrl, esConfig, enableLog = false) {
  const lastSlashIndex = mongoUrl.lastIndexOf('/');
  // For some reason (probably mongo go driver) monstache can't connect to replica set by url 'mongodb://localhost:27017/ha-dev'
  // throwing error "Unable to connect to MongoDB using URL mongodb://localhost:27017/ha-dev: auth error: sasl conversation error: unable to authenticate using mechanism "SCRAM-SHA-1": (AuthenticationFailed) Authentication failed."
  // But monctache can connect to replica set - "mongodb://localhost:27017/?replicaSet=rs0" or simply "mongodb://localhost:27017/"
  const mongoUrlWithoutDbName = mongoUrl.slice(0, lastSlashIndex);
  const dbName = mongoUrl.slice(lastSlashIndex + 1);
  const collectionNames = _.keys(models);

  await checkIsMonstacheCorrect();
  const changeStreamCfg = generateTomlForChangeStream(mongoUrlWithoutDbName, dbName, esConfig, collectionNames);
  await fs.outputFile(changeStreamCfgPath, changeStreamCfg);
  await runChangeStreamConfig(changeStreamCfgPath, enableLog);
}

module.exports = startRealTimeSync;
