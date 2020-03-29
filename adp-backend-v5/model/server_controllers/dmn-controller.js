const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});
const _ = require('lodash');
const Promise = require('bluebird');
const { ObjectID } = require('mongodb');
const log = require('log4js').getLogger('dmn-controller');
const uuidv4 = require('uuid/v4');

const { getDocValueForExpression } = require('../../lib/util/util');
const { initJavaInstance, getValidatedDmnUtilInstance, emitBackgroundJobEvent } = require('../../lib/dmn/dmn-util');
const processorContext = require('../../lib/dmn/dmn-processor-context');

const { setCommonContext, set: setProcessorContext } = processorContext;

const DMN_QUEUE_NAME = 'dmnRunner';
const dmnBatchSize = +process.env.DMN_BATCH_SIZE || 10000;
const dmnRunnerConcurrency = +process.env.DMN_RUNNER_CONCURRENCY || 1;
const ruleCollectionName = 'businessRules';

module.exports = () => {
  const m = {};

  m.init = async appLib => {
    if (process.env.JAVA_ENABLE !== 'true') {
      return;
    }

    m.appLib = appLib;
    m.ValidationError = appLib.errors.ValidationError;

    setCommonContext({ db: appLib.db, cache: appLib.cache, log });

    const depDirFullPath = require('path').resolve(__dirname, '../../lib/dmn/dependency');
    await initJavaInstance(depDirFullPath);

    createDmnQueue();
    appLib.addRoute('get', `/rulesRun/:ruleId`, [appLib.isAuthenticated, m.runDmnRule]);
  };

  function createDmnQueue() {
    m.dmnRunnerQueue = m.appLib.queue.createQueue(DMN_QUEUE_NAME);
    m.dmnRunnerQueue
      .on('progress', (job, progress) => log.info(`Job with id ${job.id} progress is ${progress}`))
      .on('error', error => log.error(`Bull error occurred.`, error.stack))
      .on('completed', async job => {
        const message = `Job with id ${job.id} successfully completed`;
        log.info(message);
        emitBackgroundJobEvent(m.appLib, {
          creatorId: job.data.creator._id,
          level: 'info',
          message,
          data: { jobId: job.id },
        });
      })
      .on('failed', async (job, error) => {
        log.error(`Error occurred for job with id ${job.id}.`, error.stack);
        emitBackgroundJobEvent(m.appLib, {
          creatorId: job.data.creator._id,
          level: 'error',
          message: `Error occurred for job with id ${job.id}. ${error.message}`,
          data: { jobId: job.id },
        });
      })
      .on('stalled', job => {
        const message = `Job with id ${job.id} progress is stalled`;
        log.warn(message);
        emitBackgroundJobEvent(m.appLib, {
          creatorId: job.data.creator._id,
          level: 'warning',
          message,
          data: { jobId: job.id },
        });
      })
      .on('active', job => {
        const message = `Job with id ${job.id} has started`;
        log.info(message);
        emitBackgroundJobEvent(m.appLib, {
          creatorId: job.data.creator._id,
          level: 'info',
          message,
          data: { jobId: job.id },
        });
      });

    m.dmnRunnerQueue.process(dmnRunnerConcurrency, require('../../lib/dmn/dmn-queue-processor')(processorContext));
  }

  m.runDmnRule = async (req, res) => {
    const ruleId = _.get(req, 'params.ruleId');
    try {
      const rule = await m.appLib.db.collection(ruleCollectionName).findOne({ _id: ObjectID(ruleId) });
      const { dmnXml, decisionId } = rule.definition || {};
      if (!dmnXml || !decisionId) {
        return res.json({
          success: false,
          message: `Please fill-in your DMN xml and main decision.`,
        });
      }

      const { _id: datasetRecordId, table: datasetsCollectionName } = rule.target;
      const [dmnUtilInstance, datasetRecord] = await Promise.all([
        getValidatedDmnUtilInstance(dmnXml, decisionId),
        m.appLib.db.collection(datasetsCollectionName).findOne({ _id: datasetRecordId }),
      ]);

      const { collectionName: datasetCollectionName } = datasetRecord;
      const ruleRunId = new Date().toISOString();
      const datasetRecordsCount = await m.appLib.db.collection(datasetCollectionName).countDocuments();

      const jobContextId = uuidv4();
      setProcessorContext(jobContextId, { dmnUtilInstance });

      const userLabel = _.get(m.appLib.appModel.models.backgroundJobs, 'creator.lookup.table.users.label');
      const creatorId = req.user._id;
      const job = await m.dmnRunnerQueue.add({
        jobContextId,
        creator: {
          _id: creatorId, // it's passed as string to redis job
          table: 'users',
          label: userLabel ? getDocValueForExpression(req.user, userLabel) : req.user.login,
        },
        batchSize: dmnBatchSize,
        datasetRecordsCount,
        ruleLookup: {
          _id: rule._id, // it's passed as string to redis job
          table: 'rules',
          label: rule.name,
        },
        datasetCollectionName,
        ruleRunId,
      });

      log.info(`Added a job with id '${job.id}' for ruleId '${ruleId}', ruleRunId '${ruleRunId}'`);
      res.json({
        success: true,
        data: { queueName: DMN_QUEUE_NAME, jobId: job.id, ruleId, ruleRunId },
      });
    } catch (e) {
      const defaultErrMessage = `Unable to add a job for ruleId '${ruleId}'.`;
      if (e instanceof m.ValidationError) {
        log.error(defaultErrMessage, e.message);
        return res.json({ success: false, message: e.message });
      }

      log.error(defaultErrMessage, e.stack);
      res.json({ success: false, message: defaultErrMessage });
    }
  };

  return m;
};
