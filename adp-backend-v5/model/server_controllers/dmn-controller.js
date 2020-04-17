const _ = require('lodash');
const Promise = require('bluebird');
const { ObjectID } = require('mongodb');
const log = require('log4js').getLogger('dmn-controller');
const uuidv4 = require('uuid/v4');

const { getDocValueForExpression } = require('../../lib/util/util');
const { initJavaInstance, getValidatedDmnUtilInstance } = require('../../lib/dmn/dmn-util');
const { addLogsAndNotificationsForQueueEvents } = require('../../lib/util/backgroundJobs');
const { getOrCreateContext } = require('../../lib/graphql/background-jobs/processors/processor-context');

const processorContext = getOrCreateContext('dmnContext');
const { setCommonContext, set: setProcessorContext } = processorContext;

const DMN_QUEUE_NAME = 'dmnRunner';
const dmnBatchSize = +process.env.DMN_BATCH_SIZE || 10000;
const dmnRunnerConcurrency = +process.env.DMN_RUNNER_CONCURRENCY || 1;
const ruleCollectionName = 'businessRules';

module.exports = () => {
  const m = {};

  m.init = async (appLib) => {
    if (!appLib.queue.isReady()) {
      log.warn(`DMN runner is disabled due to required Bull queue is disabled`);
      return;
    }

    if (process.env.JAVA_ENABLE !== 'true') {
      log.warn(`DMN runner is disabled due to required JAVA is disabled`);
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
    addLogsAndNotificationsForQueueEvents(m.appLib, m.dmnRunnerQueue, log);

    m.dmnRunnerQueue.process(
      dmnRunnerConcurrency,
      require('../../lib/graphql/background-jobs/processors/dmn-queue-processor')(processorContext)
    );
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
