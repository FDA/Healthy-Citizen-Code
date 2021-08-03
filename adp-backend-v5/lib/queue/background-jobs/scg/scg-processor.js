const _ = require('lodash');
const { getPercentage } = require('../util');
const { getGenerators } = require('../../../synthetic-content-generator/start-helpers');
const { generateDocs } = require('../../../synthetic-content-generator/generate-data');

module.exports = (context) => async (job) => {
  const { args } = job.data;
  const { appLib, log, generatorFiles, paramsForGeneratorFiles } = context.getCommonContext();

  const { count, batchName, collectionName } = args;
  const _paramsForGeneratorFiles = _.cloneDeep(paramsForGeneratorFiles);
  _paramsForGeneratorFiles.batchName = batchName;

  const generators = await getGenerators({ generatorFiles, paramsForGeneratorFiles: _paramsForGeneratorFiles });

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

  try {
    await generateDocs({ appLib, env: appLib.config, generators, collectionName, count, log, onDocInsert });
  } finally {
    await appLib.cache.clearCacheForModel(collectionName);
  }
};
