const args = require('optimist').argv;
const path = require('path');
const _ = require('lodash');
const uuidv4 = require('uuid/v4');

const { transformFilesToModel } = require('./src/services/file_to_model/src/file_to_model');
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
  skipSheets: [
    SHEET_TYPES.ACTION,
    /*SHEET_TYPES.SCHEMA,*/  // necessary for defining types if ~etl tab is missing
    ],
};
if (args.camelCaseColumns) {
  options.camelCaseColumns = args.camelCaseColumns === 'true';
}

transformFilesToModel(filePaths, outputModelPath, options)
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
