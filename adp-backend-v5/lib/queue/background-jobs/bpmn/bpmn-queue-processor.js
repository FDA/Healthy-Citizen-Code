const { ObjectID } = require('mongodb');
const Promise = require('bluebird');
const { Engine } = require('bpmn-engine');
const NP = require('number-precision');
const { getServices } = require('./services');

NP.enableBoundaryChecking(false);

module.exports = (context) => async (job) => {
  const {
    xml,
    creator,
    batchSize,
    inputCollectionName,
    inputRecordsCount,
    outputCollection,
    outputPrefix,
    parameters,
    inputDataMapping,
    outputDataMapping,
  } = job.data;
  // since job.data is valid json
  creator._id = ObjectID(creator._id);

  const { db, cache, log, backgroundJobsUtil } = context.getCommonContext();
  const { flattenObject, processDataMapping, upsertResultRecords } = backgroundJobsUtil;
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
  const execState = {
    docs: [],
    processedDocsCount: 0,
    services: getServices(db, log),
  };

  try {
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      execState.docs.push(doc);

      if (execState.docs.length >= batchSize) {
        await processDocs();
      }
    }
    execState.docs.length && (await processDocs());

    await cache.clearCacheForModel(outputCollection);
  } catch (e) {
    throw new Error(`Unable to process a job with id ${job.id}. ${e.stack}`);
  }

  async function processDocs() {
    const resultRecords = [];

    const { docs, services } = execState;
    await Promise.map(
      docs,
      async (initDoc) => {
        // Create new Engine for every document since in case of using one engine for all executions "JavaScript heap out of memory" error occurred
        const engine = Engine({
          source: xml,
          moddleOptions: {
            camunda: require('camunda-bpmn-moddle/resources/camunda'),
          },
        });

        const mappedData = processDataMapping({ input: initDoc, dataMapping: inputDataMapping });
        const result = await new Promise((resolve, reject) => {
          engine.execute({ variables: { data: mappedData, parameters }, services }, (err, _execution) => {
            if (err) {
              return reject(err);
            }
            resolve(_execution.environment.output);
          });
        });

        const { _id } = initDoc;
        delete initDoc._id;

        const flattenVariables = flattenObject(initDoc, '');
        const mappedResult = processDataMapping({ input: result, dataMapping: outputDataMapping });
        const flattenMappedResult = flattenObject(mappedResult, outputPrefix);
        resultRecords.push({
          _id,
          updatedAt: now,
          deletedAt: new Date(0),
          ...flattenVariables,
          ...flattenMappedResult,
        });
      },
      { concurrency: 10 }
    );

    await upsertResultRecords({
      db,
      collection: outputCollection,
      resultRecords,
      $setOnInsert: { creator, createdAt: now },
    });

    execState.processedDocsCount += execState.docs.length;
    execState.docs = [];
    const roundedRatio = NP.round(execState.processedDocsCount / inputRecordsCount, 5);
    const percentage = NP.round(roundedRatio * 100, 2);
    job.progress(percentage);
  }
};
