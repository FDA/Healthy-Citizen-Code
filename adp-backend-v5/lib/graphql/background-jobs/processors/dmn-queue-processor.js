const { ObjectID } = require('mongodb');
const _ = require('lodash');
const { processDmnVariables } = require('../../../dmn/dmn-util');

const rulesRunsCollectionName = 'businessRulesRuns';

module.exports = (context) => {
  return async (job) => {
    const {
      jobContextId,
      creator,
      batchSize,
      datasetRecordsCount,
      ruleLookup,
      datasetCollectionName,
      ruleRunId,
    } = job.data;
    // since job.data is valid json
    ruleLookup._id = ObjectID(ruleLookup._id);
    creator._id = ObjectID(creator._id);

    const { dmnUtilInstance, db, cache, log } = context.get(jobContextId);
    const now = new Date();

    // TODO: remove all synthesized fields from projections i.e make a lookup to the scheme and pass projections to job.data?
    const cursor = db.collection(datasetCollectionName).aggregate([
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

    let variables = [];
    let processedVariables = 0;

    try {
      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        variables.push(doc);
        if (variables.length >= batchSize) {
          await processVariables();
        }
      }
      await processVariables();
      await cache.clearCacheForModel(rulesRunsCollectionName);
    } catch (e) {
      log.error(`Unable to process a job with id ${job.id}`, e.stack);
    }

    async function processVariables() {
      const decisionEntriesElems = await processDmnVariables(dmnUtilInstance, variables);

      const rulesRunRecords = [];
      _.each(decisionEntriesElems, (decisionEntries, index) => {
        rulesRunRecords.push({
          // TODO: pass each doc through validate/transform/synthesize?
          creator,
          createdAt: now,
          updatedAt: now,
          deletedAt: new Date(0),
          rule: ruleLookup,
          ruleRunId,
          jobId: job.id,
          // variablesRecordId: variables[index]._id,
          variablesPassed: variables[index],
          decisionEntries,
        });
      });

      processedVariables += variables.length;
      variables = [];

      await db.collection(rulesRunsCollectionName).insertMany(rulesRunRecords, { ordered: false });

      const ratio = Math.floor((processedVariables / datasetRecordsCount) * 100) / 100;
      const percentage = ratio * 100;
      job.progress(percentage);
    }
  };
};
