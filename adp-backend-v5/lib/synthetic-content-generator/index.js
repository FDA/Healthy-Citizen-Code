const _ = require('lodash');
const Promise = require('bluebird');
const fs = require('fs-extra');
const path = require('path');
const dotenv = require('dotenv');
const RJSON = require('relaxed-json');
const glob = require('glob');
const commandLineArgs = require('command-line-args');
const mongoose = require('mongoose');

const { generateDataByModel } = require('./generate-data');
const { combineModels } = require('../util/model');
const { getAbsolutePath } = require('../util/env');
const { getCollectionOrder } = require('./build-collection-order-to-generate');

const optionDefinitions = [
  { name: 'corePath', type: String },
  { name: 'schemaPath', type: String },
  { name: 'batchName', type: String },
  { name: 'uploadDir', type: String },
  { name: 'count', type: Number },
  { name: 'mongoUrl', type: String },
  { name: 'excludeCollections', type: String },
  { name: 'includeCollections', type: String },
];

const defaultBatchName = new Date().toISOString();
const defaultUploadDir = '../uploads';
const defaultCount = 10;
const defaultExcludeCollections = '["users","roles","files", "dxGridViews", "datasets"]';

(async () => {
  try {
    await run();
    console.log(`Finished.`);
    process.exit(0);
  } catch (e) {
    console.error(e.stack);
    process.exit(1);
  }
})();

function getEnv(corePath, schemaPath) {
  const coreEnv = dotenv.load({ path: path.resolve(corePath, '.env') }).parsed;
  const schemaEnv = {};
  _.each(schemaPath, p => {
    _.merge(schemaEnv, dotenv.load({ path: path.resolve(p, '.env') }).parsed);
  });

  return _.merge(coreEnv, schemaEnv);
}

async function run() {
  const { args, errors: argsErrors } = validateArgs(commandLineArgs(optionDefinitions));
  if (argsErrors.length) {
    return console.error(`Invalid arguments found:\n${argsErrors.join('\n')}`);
  }

  const { corePath, schemaPath, mongoUrl, count, batchName, uploadDir, excludeCollections, includeCollections } = args;
  const appLib = await prepareAppLib(corePath, schemaPath);

  const allCollections = Object.keys(appLib.appModel.models);
  const collectionsToCheck = excludeCollections || includeCollections;
  const invalidCollections = [];
  _.each(collectionsToCheck, col => {
    if (!allCollections.includes(col)) {
      invalidCollections.push(col);
    }
  });
  if (invalidCollections.length) {
    const cols = invalidCollections.join(',');
    console.error(
      `--- Invalid collection names specified either in excludeCollections or includeCollections argument: ${cols}`
    );
    return;
  }

  const mutil = require('../model')(appLib);
  try {
    const { errors, warnings } = mutil.validateAndCleanupAppModel();
    if (warnings.length) {
      console.warn(`--- Model warnings:\n${warnings.join('\n')}`);
      console.warn('='.repeat(30));
    }
    if (errors.length) {
      console.error(`--- Invalid model specified:\n${errors.join('\n')}`);
      return;
    }
  } catch (e) {
    throw new Error(
      `Unable to process model. Make sure that you specified all schemes in 'schemaPath' parameters including core model.\n${e.stack}`
    );
  }

  await connectMongoose(appLib, mongoUrl);
  await mutil.generateMongooseModels(appLib.db, appLib.appModel.models);
  await injectListValues(appLib);

  const paramsForGeneratorFiles = await getParamsForGeneratorFiles({
    corePath,
    schemaPath,
    appLib,
    batchName,
    uploadDir,
  });
  const functions = await getFunctions({ corePath, schemaPath, paramsForGeneratorFiles });

  const collections = includeCollections || allCollections;
  const collectionOrder = getCollectionOrder(collections, appLib.lookupFieldsMeta, excludeCollections);
  const env = getEnv(corePath, schemaPath);
  for (const collectionName of collectionOrder) {
    await generateDocs({ appLib, env, functions, collectionName, count });
  }
}

// TODO: in the future get rid of default params, it should be set dynamically with pregenerators
// Pregenerators are launched sequentially with paramsForGeneratorFiles passed in it to build final paramsForGeneratorFiles.
async function getParamsForGeneratorFiles({ appLib, corePath, schemaPath, batchName, uploadDir }) {
  const pregeneratorSpecs = _.get(appLib, 'appModel.interface.app.generatorSpecification', []);
  const pregeneratorFiles = getHelperFiles(corePath, schemaPath, 'pregenerators');
  const pregeneratorFunctions = {};

  _.each(pregeneratorFiles, file => {
    _.merge(pregeneratorFunctions, require(file));
  });

  // default params
  const paramsForGeneratorFiles = {
    random: require('../util/random').random,
    chance: require('../util/random').chance,
    ScgError: require('./errors/scg-error'),
    batchName,
    handleUpload: file => appLib.fileControllerUtil.handleSingleFileUpload(file, null, null, uploadDir),
  };

  const invalidPregeneratorNames = [];
  await Promise.mapSeries(pregeneratorSpecs, spec => {
    const { generator: pregeneratorName, params: pregeneratorParams = {} } = spec;
    const pregeneratorFunction = pregeneratorFunctions[pregeneratorName];
    if (!pregeneratorFunction) {
      invalidPregeneratorNames.push(pregeneratorName);
    }
    return pregeneratorFunction({ pregeneratorParams, paramsForGeneratorFiles });
  });

  if (!_.isEmpty(invalidPregeneratorNames)) {
    throw new Error(
      `Invalid pregenerator specification. Unable to find pregenerators: ${invalidPregeneratorNames.join(', ')}`
    );
  }

  return paramsForGeneratorFiles;
}

function getHelperFiles(corePath, schemaPath, helperName) {
  return _.concat(
    glob.sync(`${corePath}/model/helpers/${helperName}/**/*.js`),
    glob.sync(`${corePath}/model/helpers/${helperName}.js`),
    _.flatten(
      schemaPath.map(p => [
        ...glob.sync(`${p}/helpers/${helperName}/**/*.js`),
        ...glob.sync(`${p}/helpers/${helperName}.js`),
      ])
    )
  );
}

async function getFunctions({ corePath, schemaPath, paramsForGeneratorFiles }) {
  const generatorsFiles = getHelperFiles(corePath, schemaPath, 'generators');
  const functions = {};

  _.each(generatorsFiles, file => {
    _.merge(functions, require(file)(paramsForGeneratorFiles));
  });

  return functions;
}

function validateArgs(args) {
  const {
    corePath,
    schemaPath = [],
    mongoUrl,
    count = defaultCount,
    batchName = defaultBatchName,
    uploadDir = defaultUploadDir,
  } = args;
  let { excludeCollections, includeCollections } = args;

  const errors = [];

  if (!mongoUrl) {
    errors.push(`Argument 'mongoUrl' must be specified.`);
  }
  if (!_.isNumber(count) || count < 0) {
    errors.push(`Argument 'count' must be a positive number.`);
  }
  if (!corePath) {
    errors.push(`Argument 'corePath' must be specified.`);
  }
  const corePathAbsolute = path.resolve(process.cwd(), corePath);
  if (!fs.pathExistsSync(corePathAbsolute)) {
    errors.push(`Argument 'corePath' must be an existing directory (relative or absolute).`);
  }

  const appRoot = path.resolve(__dirname, '../../');
  const schemaAbsolutePaths = schemaPath
    .split(',')
    .map(p => getAbsolutePath(appRoot, p))
    .filter(p => p);

  _.each(schemaAbsolutePaths, p => {
    if (!fs.pathExistsSync(p)) {
      errors.push(`Argument 'schemaPath' contains '${p}', which must be an existing directory (relative or absolute).`);
    }
  });

  if (!uploadDir) {
    errors.push(`Argument 'uploadDir' must be specified.`);
  }
  if (!batchName) {
    errors.push(`Argument 'batchName' must be specified.`);
  }
  if (excludeCollections && includeCollections) {
    errors.push(
      'Arguments excludeCollections and includeCollections are mutually exclusive, they should not be specified in the same call'
    );
  }

  if (includeCollections) {
    const includeCollectionsErrMsg = `Argument includeCollections=${includeCollections} must be an array of collection names if specified`;
    try {
      const parsed = RJSON.parse(includeCollections);
      if (!_.isArray(parsed)) {
        errors.push(includeCollectionsErrMsg);
      } else {
        includeCollections = parsed;
      }
    } catch (e) {
      errors.push(includeCollectionsErrMsg);
    }
  } else {
    const excludeCollectionsErrMsg = `Argument excludeCollections=${excludeCollections} must be an array of collection names if specified`;
    excludeCollections = excludeCollections || defaultExcludeCollections;
    try {
      const parsed = RJSON.parse(excludeCollections);
      if (!_.isArray(parsed)) {
        errors.push(excludeCollectionsErrMsg);
      } else {
        excludeCollections = parsed;
      }
    } catch (e) {
      errors.push(excludeCollectionsErrMsg);
    }
  }

  return {
    errors,
    args: {
      corePath: corePathAbsolute,
      schemaPath: schemaAbsolutePaths,
      mongoUrl,
      count,
      batchName,
      uploadDir,
      excludeCollections,
      includeCollections,
    },
  };
}

async function prepareAppLib(corePath, schemaPath) {
  const appLib = {};
  require('dotenv').load({ path: path.resolve(`${__dirname}/../../.env`) });

  appLib.errors = require('../errors');
  appLib.butil = require('../util/util');

  appLib.transformers = require('../transformers')(appLib);
  const helperDirPaths = [`${corePath}/model/helpers`, ...schemaPath.map(p => `${p}/helpers`)];
  const buildAppModelCodeOnStart = false;
  appLib.helperUtil = await require('../helper-util')(appLib, helperDirPaths, buildAppModelCodeOnStart);

  appLib.appModel = await combineModels({
    modelSources: [`${corePath}/model/model`, ...schemaPath.map(p => `${p}/model`)],
    log: console.log.bind(console),
    appModelProcessors: appLib.appModelHelpers.appModelProcessors,
    macrosDirPaths: [...schemaPath.map(p => `${p}/macroses`), `${corePath}/model/macroses`],
  });
  mergePregenerators(appLib.appModel);

  appLib.accessCfg = require('../access/access-config');
  appLib.allActionsNames = [...appLib.accessCfg.DEFAULT_ACTIONS, ..._.keys(appLib.appModelHelpers.CustomActions)];

  appLib.accessUtil = require('../access/access-util')(appLib);
  appLib.filterUtil = require('../filter/util');
  appLib.fileControllerUtil = require('../file-controller-util')();
  appLib.getAuthSettings = () => appLib.appModel.interface.app.auth;
  appLib.accessUtil.setAvailablePermissions();
  return appLib;

  function mergePregenerators(appModel) {
    const pregenerators = appModel.interface.app.generatorSpecification;
    if (_.isEmpty(pregenerators)) {
      return;
    }

    const deduplicatedPregenerators = [];
    const handledGenerators = new Set();
    _.each(pregenerators, obj => {
      const pregeneratorName = obj.generator;
      if (handledGenerators.has(pregeneratorName)) {
        return;
      }
      const lastDeclaredPregenerator = _.findLast(
        pregenerators,
        declaredLast => pregeneratorName === declaredLast.generator
      );
      deduplicatedPregenerators.push(lastDeclaredPregenerator);
      handledGenerators.add(pregeneratorName);
    });

    appModel.interface.app.generatorSpecification = deduplicatedPregenerators;
  }
}

async function connectMongoose(appLib, mongoUrl) {
  mongoose.set('useNewUrlParser', true);
  mongoose.set('useFindAndModify', false);
  mongoose.set('useCreateIndex', true);
  mongoose.set('useUnifiedTopology', true);
  appLib.db = await mongoose.connect(mongoUrl);
}

function injectListValues(appLib) {
  const userPermissions = new Set(Object.values(appLib.accessCfg.PERMISSIONS));
  const inlineContext = {};
  return appLib.accessUtil.injectListValues(userPermissions, inlineContext, appLib.appModel.models);
}

async function generateDocs({ appLib, env, functions, collectionName, count }) {
  const { models } = appLib.appModel;
  const {
    transformers,
    errors: { ValidationError },
    butil: { stringifyObj },
  } = appLib;
  const model = models[collectionName];

  for (let i = 0; i < count; i++) {
    const modelName = model.schemaName;
    const record = await generateDataByModel({ functions, model, env });

    try {
      await transformers.preSaveTransformData(collectionName, {}, record, []);
    } catch (e) {
      const msg = `Generated '${collectionName}' record failed validation. It will be skipped.`;
      if (e instanceof ValidationError) {
        console.error(`${msg}\n${e.message}`);
      } else {
        console.error(`${msg}\n${e.stack}\nRecord:${stringifyObj(record)}`);
      }
      continue;
    }

    const response = await mongoose.model(modelName).collection.insertOne(record);
    const insertedDoc = response.ops[0];
    console.log(`> Inserted record in '${modelName}':`, JSON.stringify(insertedDoc, null, 2));
  }
}
