const _ = require('lodash');
const commandLineArgs = require('command-line-args');

const {
  validateArgs,
  prepareAppLib,
  injectListValues,
  getParamsForGeneratorFiles,
  getGenerators,
  getHelperFiles,
  getEnv,
} = require('./start-helpers');
const { getCollectionOrder } = require('./build-collection-order-to-generate');
const { generateDocs } = require('./generate-data');
const { mongoConnect } = require('../util/mongo');

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

async function run() {
  const { args, errors: argsErrors } = validateArgs(commandLineArgs(optionDefinitions));
  if (argsErrors.length) {
    return console.error(`Invalid arguments found:\n${argsErrors.join('\n')}`);
  }

  const { corePath, schemaPath, mongoUrl, count, batchName, excludeCollections, includeCollections } = args;
  const appLib = await prepareAppLib(corePath, schemaPath);
  args.uploadDir = args.uploadDir || appLib.file.constants.uploadDir;

  const allCollections = Object.keys(appLib.appModel.models);
  const collectionsToCheck = excludeCollections || includeCollections;
  const invalidCollections = [];
  _.each(collectionsToCheck, (col) => {
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
    const { errors, warnings } = mutil.validateAndCleanupAppModel(appLib.appModel.models);
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

  appLib.db = await mongoConnect(mongoUrl);
  await injectListValues(appLib);

  const pregeneratorFiles = getHelperFiles(corePath, schemaPath, 'pregenerators');
  const paramsForGeneratorFiles = await getParamsForGeneratorFiles({
    pregeneratorFiles,
    appLib,
    batchName,
    uploadDir: args.uploadDir,
  });
  const generatorFiles = getHelperFiles(corePath, schemaPath, 'generators');
  const generators = getGenerators({ generatorFiles, paramsForGeneratorFiles });

  const collections = includeCollections || allCollections;
  const collectionOrder = getCollectionOrder(collections, appLib.lookupFieldsMeta, excludeCollections);
  const env = getEnv(corePath, schemaPath);
  const onDocInsert = ({ collectionName, insertedDoc }) => {
    console.log(`> Inserted record in '${collectionName}':`, JSON.stringify(insertedDoc, null, 2));
  };
  for (const collectionName of collectionOrder) {
    await generateDocs({ appLib, env, generators, collectionName, count, log: console, onDocInsert });
  }
}
