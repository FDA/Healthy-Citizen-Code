const args = require('optimist').argv;
const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');
const uuidv4 = require('uuid/v4');

const { transformFilesToModel } = require('./src/services/file_to_model/src/file_to_model');
const { stringifyModel } = require('./src/services/file_to_model/src/csv/util');
const { SHEET_TYPES } = require('./src/services/file_to_model/src/consts');

const DEFAULT_MODEL_DIRECTORY = './src/services/file_to_model/generated/model';

const filePaths = _.isArray(args.inputFilePath) ? args.inputFilePath : [args.inputFilePath];

function getOutputModelPath(outputModelPath) {
  if (outputModelPath) {
    return path.resolve(__dirname, outputModelPath);
  }
  return `${DEFAULT_MODEL_DIRECTORY}/${uuidv4()}.json`;
}

const outputModelPath = getOutputModelPath(args.outputModelPath);
const options = {
  backendMetaschema: args.backendMetaschema,
  seedMongoUrl: args.seedMongoUrl,
  skipSheets: [SHEET_TYPES.ETL_DATA_SEED, SHEET_TYPES.ETL_SPEC],
};
if (args.camelCaseColumns) {
  options.camelCaseColumns = args.camelCaseColumns === 'true';
}

(async () => {
  try {
    const model = await transformFilesToModel(filePaths, outputModelPath, options);
    await fs.outputFile(outputModelPath, stringifyModel(model));
    console.log(`Model is written to: ${outputModelPath}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
