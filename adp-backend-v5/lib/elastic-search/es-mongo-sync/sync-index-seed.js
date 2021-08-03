const fs = require('fs-extra');
const _ = require('lodash');
const path = require('path');
const { spawn } = require('child_process');
const tomlify = require('tomlify');
const commandLineArgs = require('command-line-args');
const { checkIsMonstacheCorrect } = require('./util');
const { getEsConfig } = require('../index');
const { getSchemaNestedPaths, getConfigFromEnv, appRoot, getOrderedList } = require('../../../config/util');

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
      'direct-read-namespaces': collectionNames.map((c) => `${dbName}.${c}`),
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
    proc.stdout.on('data', (data) => {
      console.info(data.toString());
    });
    proc.stderr.on('data', (data) => {
      console.error(data.toString());
    });
  }
  proc.on('close', (code) => {
    console.info(`Finished syncing with code ${code}.`);
  });
}

async function getAllCollecitonNames(appSchemaPaths) {
  const appLib = {};

  appLib.errors = require('../../errors');
  appLib.butil = require('../../util/util');

  appLib.transformers = require('../../transformers')(appLib);

  const coreHelpers = path.join(appRoot, '/model/helpers');
  const modelHelpers = getSchemaNestedPaths(appSchemaPaths, 'helpers');
  const helperDirPaths = [coreHelpers, ...modelHelpers];
  const buildAppModelCodeOnStart = false;
  appLib.helperUtil = await require('../../helper-util')(appLib, helperDirPaths, buildAppModelCodeOnStart);

  const { combineModels } = require('../../util/model');
  const { model } = await combineModels({
    modelSources: [`${appRoot}/model/model`, ...getSchemaNestedPaths(appSchemaPaths, 'model')],
    log: console.log.bind(console),
    appModelProcessors: appLib.appModelHelpers.appModelProcessors,
    macrosDirPaths: [...getSchemaNestedPaths(appSchemaPaths, 'macros'), `${appRoot}/model/macros`],
  });
  appLib.appModel = model;

  return _.keys(appLib.appModel.models);
}

async function startIndexSeedSync(config) {
  const { APP_SCHEMA, MONGODB_URI, ES_NODES, ES_MAX_RETRIES } = config;
  const lastSlashIndex = MONGODB_URI.lastIndexOf('/');
  // For some reason (probably mongo Golang driver) monstache can't connect to replica set by url 'mongodb://localhost:27017/ha-dev'
  // throwing error "Unable to connect to MongoDB using URL mongodb://localhost:27017/ha-dev: auth error: sasl conversation error: unable to authenticate using mechanism "SCRAM-SHA-1": (AuthenticationFailed) Authentication failed."
  // But monctache can connect to replica set - "mongodb://localhost:27017/?replicaSet=rs0" or simply "mongodb://localhost:27017/"
  const mongoUrlWithoutDbName = MONGODB_URI.slice(0, lastSlashIndex);
  const dbName = MONGODB_URI.slice(lastSlashIndex + 1);

  const esConfig = getEsConfig(ES_NODES, ES_MAX_RETRIES);
  if (!esConfig) {
    throw new Error(`Unable to get Elastic Search config. Make sure environment param 'ES_NODES' is specified.`);
  }
  const esUrls = esConfig.nodes;

  const allCollections = await getAllCollecitonNames(APP_SCHEMA);
  if (_.isEmpty(allCollections)) {
    throw new Error(`Unable to get collection names for syncing. Make sure your environment params are correct.`);
  }

  const options = commandLineArgs(optionDefinitions);
  let { collections } = options;
  if (_.isEmpty(collections)) {
    collections = allCollections;
  } else {
    const allCollectionsSet = new Set(allCollections);
    const notExistingCollections = collections.filter((c) => !allCollectionsSet.has(c));
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
  require('dotenv').load({ path: `${appRoot}/.env` });
  const { errors, warnings: configWarnings, config } = getConfigFromEnv();
  if (!_.isEmpty(errors)) {
    console.error(`Config warnings:\n ${getOrderedList(errors)}`);
    process.exit(1);
  }

  const configWarningsList = getOrderedList(configWarnings);
  configWarningsList && console.warn(`Config warnings:\n ${configWarningsList}`);

  try {
    await startIndexSeedSync(config);
  } catch (e) {
    console.error(e.stack);
    process.exit(1);
  }
})();
