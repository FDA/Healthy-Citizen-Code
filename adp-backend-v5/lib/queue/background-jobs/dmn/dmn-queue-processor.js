const { ObjectID } = require('mongodb');
const _ = require('lodash');
const { processDmnVariables } = require('./dmn-util');

module.exports = (context) => async (job) => {
  const {
    jobContextId,
    creator,
    batchSize,
    inputRecordsCount,
    inputCollectionName,
    outputCollection,
    outputPrefix,
    // parameters - for now parameters are not passed to dmn java instance
    inputDataMapping,
    outputDataMapping,
  } = job.data;
  // since job.data is valid json
  creator._id = ObjectID(creator._id);

  const { dmnUtilInstance, db, cache, backgroundJobsUtil } = context.get(jobContextId);
  const { flattenObject, getPercentage, processDataMapping, upsertResultRecords } = backgroundJobsUtil;
  const now = new Date();

  // TODO: remove all synthesized fields from projections i.e make a lookup to the scheme and pass projections to job.data?
  const cursor = db.collection(inputCollectionName).aggregate([
    {
      $project: {
        // _id: 0, pass _id to track record
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
      if (data.length >= batchSize) {
        await processVariables();
      }
    }
    await processVariables();
    await cache.clearCacheForModel(outputCollection);
  } catch (e) {
    throw new Error(`Unable to process a job with id ${job.id}. ${e.stack}`);
  }

  async function processVariables() {
    const dmnData = data.map((v) => v.mappedData);
    const decisionEntriesElems = await processDmnVariables(dmnUtilInstance, dmnData);

    const resultRecords = [];
    _.each(decisionEntriesElems, (decisionEntries, index) => {
      const { initData } = data[index];
      const { _id } = initData;
      delete initData._id;

      const flattenVariables = flattenObject(initData, '');
      const mappedResult = processDataMapping({ input: decisionEntries, dataMapping: outputDataMapping });
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
