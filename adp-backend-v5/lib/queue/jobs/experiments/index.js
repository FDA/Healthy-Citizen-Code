const { ObjectID } = require('mongodb');
const { getOrCreateContext } = require('../processor-context');
const { addLogsAndNotificationsForQueueEvents } = require('../../../util/backgroundJobs');
const { handleJobError, getLookupDoc } = require('../util');
const { getExternalDatasetsMongooseModelName } = require('../../../graphql/datasets-collections/util');
const GraphQlContext = require('../../../request-context/graphql/GraphQlContext');

const processorContext = getOrCreateContext('experimentsContext');
const { setCommonContext } = processorContext;

const EXPERIMENTS_QUEUE_NAME = 'experimentsRunner';
const experimentsRunnerConcurrency = +process.env.EXPERIMENTS_RUNNER_CONCURRENCY || 1;
const experimentsCollectionName = 'experiments';

async function createExperimentsQueue({ appLib, log }) {
  setCommonContext({ appLib, log });

  const experimentsRunnerQueue = appLib.queue.createQueue(EXPERIMENTS_QUEUE_NAME);
  addLogsAndNotificationsForQueueEvents(appLib, experimentsRunnerQueue, log);

  experimentsRunnerQueue.process(
    experimentsRunnerConcurrency,
    require('./experiments-queue-processor')(processorContext)
  );

  return experimentsRunnerQueue;
}

async function createOutputDatasetForExperiment(experimentName, req, appLib) {
  const datasetsId = new ObjectID();
  const collectionName = getExternalDatasetsMongooseModelName(datasetsId);
  const name = `Dataset for experiment '${experimentName}'`;
  const datasetsRecord = { _id: datasetsId, name, collectionName, scheme: null };

  const datasetsModelName = 'datasets';
  const graphQlContext = await new GraphQlContext(appLib, req, datasetsModelName).init();
  // no filtering for create record
  graphQlContext.mongoParams = { conditions: {} };

  const createdDatasetsRecord = await appLib.controllerUtil.postItem(graphQlContext, datasetsRecord);
  await appLib.db.createCollection(datasetsRecord.collectionName);

  return {
    record: createdDatasetsRecord,
    lookup: {
      _id: createdDatasetsRecord._id,
      table: datasetsModelName,
      label: createdDatasetsRecord.name,
    },
  };
}

async function runExperiment({ _id, req, creator, appLib, log }) {
  try {
    const experimentsRunnerQueue = appLib.queue.getQueue(EXPERIMENTS_QUEUE_NAME);
    const experiment = await appLib.db.collection(experimentsCollectionName).findOne({ _id: ObjectID(_id) });
    if (!experiment) {
      return {
        success: false,
        message: `Unable to find record by experimentId '${_id}'`,
      };
    }

    let outputDatasetRecord = await getLookupDoc(appLib, experiment.outputDataset);
    if (!outputDatasetRecord) {
      const { lookup: outputDatasetLookup, record } = await createOutputDatasetForExperiment(
        experiment.name,
        req,
        appLib
      );
      outputDatasetRecord = record;
      experiment.outputDataset = outputDatasetLookup;
      await appLib.db
        .collection(experimentsCollectionName)
        .updateOne({ _id: ObjectID(_id) }, { $set: { outputDataset: outputDatasetLookup } });
    }

    const { overwrite, inputDataset } = experiment;
    const inputDatasetRecord = await getLookupDoc(appLib, inputDataset, { collectionName: 1 });
    if (!inputDatasetRecord) {
      throw new Error(`Experiment must have inputDataset`);
    }

    const { collectionName: inputCollectionName } = inputDatasetRecord;
    const inputRecordsCount = await appLib.db.collection(inputCollectionName).countDocuments();

    const { collectionName: outputCollection } = outputDatasetRecord;

    if (overwrite === true) {
      await appLib.db.collection(outputCollection).drop();
      await appLib.db.createCollection(outputCollection);
    }

    const job = await experimentsRunnerQueue.add({
      experiment,
      creator,
      experimentRunId: new Date().toISOString(),
      outputCollection,
      inputCollectionName,
      inputRecordsCount,
    });

    log.info(`Added a job with id '${job.id}' for experimentId '${_id}'`);
    return {
      success: true,
      data: { queueName: EXPERIMENTS_QUEUE_NAME, jobId: job.id, _id },
    };
  } catch (error) {
    const defaultMessage = `Unable to add a job for experimentId '${_id}'.`;
    return handleJobError({ error, log, defaultMessage });
  }
}

module.exports = {
  runExperiment,
  createExperimentsQueue,
  experimentsCollectionName,
};
