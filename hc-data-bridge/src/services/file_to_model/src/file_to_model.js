const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const uuidv4 = require('uuid/v4');
const Promise = require('bluebird');
const CsvToModelTransformer = require('./csv/csv_to_model_transformer');
const { xlsToCsv } = require('./xls/xls_to_csv');

const DEFAULT_CSV_DIRECTORY = path.resolve(__dirname, '../generated/csv');

async function getFileToTransform(inputFile, options) {
  if (!_.isString(inputFile)) {
    throw new Error(`Cannot get file to transform: input file must be specified`);
  }
  if (inputFile.endsWith('.csv')) {
    return inputFile;
  }
  if (inputFile.endsWith('.xls') || inputFile.endsWith('.xlsx') || inputFile.endsWith('.ods')) {
    const generatedCsvPath = `${DEFAULT_CSV_DIRECTORY}/${uuidv4()}.csv`;
    await xlsToCsv(inputFile, generatedCsvPath, options);
    // console.log(`Created ${generatedCsvPath}`);
    return generatedCsvPath;
  }
  throw new Error(`Extension of ${inputFile} is not supported`);
}

async function transformFileToModel(inputFilePath, outputModelPath, options) {
  const fileToTransform = await getFileToTransform(inputFilePath, options);
  const csvToModelTransformer = new CsvToModelTransformer({
    csvPath: fileToTransform,
    outputModelPath,
    ...options,
  });
  const model = await csvToModelTransformer.transform(fileToTransform, outputModelPath, options);
  return { model, csvFile: path.resolve(fileToTransform) };
}

async function transformFilesToModel(inputFilePaths, outputModelPath, options) {
  const wholeModel = {};
  // sequentially write model result from file to wholeModel
  await Promise.mapSeries(inputFilePaths, async inputFilePath => {
    const { model, csvFile } = await transformFileToModel(inputFilePath, outputModelPath, options);
    _.merge(wholeModel, model);
    await fs.unlink(csvFile);
    // console.log(`Deleted ${csvFile}`);
  });
  return wholeModel;
}

module.exports = { transformFilesToModel };
