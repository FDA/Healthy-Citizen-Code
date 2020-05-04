const { ObjectID } = require('mongodb');
const Promise = require('bluebird');
const _ = require('lodash');
const { flattenObject, getPercentage, processDataMapping, upsertResultRecords } = require('../util');
const { getAimlResult } = require('./util');

module.exports = (context) => {
  return async (job) => {
    const {
      endpoint,
      concurrentRequestNumber,
      creator,
      // parameters,
      inputDataMapping,
      outputDataMapping,
      inputCollectionName,
      inputRecordsCount,
      outputCollection,
      outputPrefix,
    } = job.data;
    // since job.data is valid json
    creator._id = ObjectID(creator._id);

    const { db, cache, log } = context.getCommonContext();
    const now = new Date();

    const cursor = db.collection(inputCollectionName).aggregate([
      {
        $project: {
          deletedAt: 0,
          creator: 0,
          createdAt: 0,
          updatedAt: 0,
        },
      },
    ]);

    let data = [];
    let processedVariables = 0;

    try {
      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        data.push({
          initData: doc,
          mappedData: processDataMapping({ input: doc, dataMapping: inputDataMapping }),
        });

        if (data.length >= concurrentRequestNumber) {
          await processVariables(data);
        }
      }
      data.length && (await processVariables(data));

      await cache.clearCacheForModel(outputCollection);
    } catch (e) {
      log.error(`Unable to process a job with id ${job.id}`, e.stack);
    }

    async function processVariables() {
      const results = await Promise.map(data, ({ mappedData }) => getAimlResult(endpoint, mappedData, log));
      const resultRecords = [];

      _.each(results, (result, index) => {
        const { initData } = data[index];
        const { _id } = initData;
        delete initData._id;

        const flattenVariables = flattenObject(initData, '');

        const { response, error } = result;
        const mappedResult = processDataMapping({
          input: _.get(response, 'data'),
          dataMapping: outputDataMapping,
          response: response || error.response,
        });
        const flattenMappedResult = flattenObject(mappedResult, outputPrefix);

        resultRecords.push({
          _id,
          updatedAt: now,
          deletedAt: new Date(0),
          ...flattenVariables,
          ...flattenMappedResult,
        });
      });

      await upsertResultRecords({
        db,
        collection: outputCollection,
        resultRecords,
        $setOnInsert: { creator, createdAt: now },
      });

      processedVariables += data.length;
      data = [];
      const percentage = getPercentage(processedVariables, inputRecordsCount);
      job.progress(percentage);
    }
  };
};
