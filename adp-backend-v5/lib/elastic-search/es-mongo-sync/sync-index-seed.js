const fs = require('fs-extra');
const _ = require('lodash');
const path = require('path');
const { spawn } = require('child_process');
const tomlify = require('tomlify');
const commandLineArgs = require('command-line-args');
const { checkIsMonstacheCorrect } = require('./util');
const { getEsConfig } = require('../index');
require('dotenv').load({ path: '.env' });

const optionDefinitions = [
  { name: 'log', alias: 'l', type: Boolean },
  { name: 'collections', type: String, multiple: true, defaultOption: [] },
];
const oneTimeIndexSeedCfgPath = path.join(__dirname, 'monstache_config', 'index_seed_config.toml');

// NOTE: 'direct-read-concur' param is used to decrease ES load: https://github.com/rwynn/monstache/issues/221#issuecomment-492715443
function generateTomlForOneTimeIndexSeed(mongoUrlWithoutDbName, dbName, esUrls, collectionNames) {
  return tomlify(
    {
      'elasticsearch-urls': _.castArray(esUrls),
      'mongo-url': mongoUrlWithoutDbName,
      'direct-read-namespaces': collectionNames.map(c => `${dbName}.${c}`),
      gzip: true,
      stats: true,
      'index-stats': true,
      'elasticsearch-max-conns': 4,
      'dropped-collections': true,
      'dropped-databases': true,
      replay: false,
      resume: false,
      'resume-write-unsafe': false,
      'resume-name': 'default',
      verbose: true,
      'exit-after-direct-reads': true,
    },
    { space: 2 }
  );
}

function runSeedIndexConfig(configPath, enableLog) {
  const proc = spawn('monstache', ['-f', configPath]);
  console.info(`Started syncing Mongo with ES with Monctache config '${configPath}'.`);
  if (enableLog) {
    proc.stdout.on('data', data => {
      console.info(data.toString());
    });
    proc.stderr.on('data', data => {
      console.error(data.toString());
    });
  }
  proc.on('close', code => {
    console.info(`Finished syncing with code ${code}.`);
  });
}

async function startIndexSeedSync() {
  const mongoUrl = process.env.MONGODB_URI;
  const lastSlashIndex = mongoUrl.lastIndexOf('/');
  // For some reason (probably mongo Golang driver) monstache can't connect to replica set by url 'mongodb://localhost:27017/ha-dev'
  // throwing error "Unable to connect to MongoDB using URL mongodb://localhost:27017/ha-dev: auth error: sasl conversation error: unable to authenticate using mechanism "SCRAM-SHA-1": (AuthenticationFailed) Authentication failed."
  // But monctache can connect to replica set - "mongodb://localhost:27017/?replicaSet=rs0" or simply "mongodb://localhost:27017/"
  const mongoUrlWithoutDbName = mongoUrl.slice(0, lastSlashIndex);
  const dbName = mongoUrl.slice(lastSlashIndex + 1);

  const esConfig = getEsConfig();
  const esUrls = esConfig.nodes;

  const { models } = require('../../model')().getCombinedModel();
  const allCollections = _.keys(models);
  const options = commandLineArgs(optionDefinitions);
  let { collections } = options;
  if (_.isEmpty(collections)) {
    collections = allCollections;
  } else {
    const allCollectionsSet = new Set(allCollections);
    const notExistingCollections = collections.filter(c => !allCollectionsSet.has(c));
    if (!_.isEmpty(notExistingCollections)) {
      return console.error(
        `Found not existing collections: ${notExistingCollections.join(', ')}. Please adjust 'collections' option.`
      );
    }
  }

  await checkIsMonstacheCorrect();
  const oneTimeIndexSeedCfg = generateTomlForOneTimeIndexSeed(mongoUrlWithoutDbName, dbName, esUrls, collections);
  await fs.outputFile(oneTimeIndexSeedCfgPath, oneTimeIndexSeedCfg);
  await runSeedIndexConfig(oneTimeIndexSeedCfgPath, options.log);
}

(async () => {
  await startIndexSeedSync();
})();
