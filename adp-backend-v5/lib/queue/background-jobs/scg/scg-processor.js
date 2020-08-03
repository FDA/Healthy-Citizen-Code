const _ = require('lodash');
const { getPercentage } = require('../util');
const { getFunctions } = require('../../../synthetic-content-generator/start-helpers');
const { generateDocs } = require('../../../synthetic-content-generator/generate-data');

module.exports = (context) => {
  return async (job) => {
    const { args } = job.data;
    const { appLib, log, generatorFiles, paramsForGeneratorFiles } = context.getCommonContext();

    const { count, batchName, collectionName } = args;
    const _paramsForGeneratorFiles = _.cloneDeep(paramsForGeneratorFiles);
    _paramsForGeneratorFiles.batchName = batchName;

    const functions = await getFunctions({ generatorFiles, paramsForGeneratorFiles: _paramsForGeneratorFiles });

    let generatedDocs = 0;
    const onDocInsert = function (_args) {
      const { collectionName: colName, insertedDoc } = _args;
      log.info(`Generated doc for collection ${colName}: ${JSON.stringify(insertedDoc)}`);
      generatedDocs += 1;
      if (generatedDocs % 10 === 0 || generatedDocs === count) {
        const percentage = getPercentage(generatedDocs, count);
        job.progress(percentage);
      }
    };

    await generateDocs({ appLib, env: process.env, functions, collectionName, count, log, onDocInsert });
    await appLib.cache.clearCacheForModel(collectionName);
  };
};
