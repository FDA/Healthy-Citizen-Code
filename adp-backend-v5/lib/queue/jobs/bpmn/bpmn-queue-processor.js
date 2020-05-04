const { ObjectID } = require('mongodb');
const Promise = require('bluebird');
const _ = require('lodash');
const { Engine } = require('bpmn-engine');
const { EventEmitter } = require('events');
const { getValidatedDmnUtilInstance, processDmnVariables } = require('../dmn/dmn-util');
const { getAimlResult } = require('../aiml/util');
const { ruleCollectionName } = require('../dmn');
const { flattenObject, getPercentage, processDataMapping, upsertResultRecords } = require('../util');

function getServices(db, log) {
  const m = {};

  m.lookup = async (value, collectionName, fieldName) => {
    const doc = await db.collection(collectionName).findOne({ [fieldName]: value, deletedAt: new Date(0) }, { _id: 1 });
    return !!doc;
  };

  m.mux = (ws, vs) => {
    if (!Array.isArray(ws) || !Array.isArray(vs) || ws.length !== vs.length) {
      throw new Error(`Invalid params. Weights and values should be arrays of same length`);
    }

    return ws.reduce((result, w, index) => {
      result += w * vs[index];
      return result;
    }, 0);
  };

  m.dmn = async (name, variables) => {
    const dmnRuleRecord = await db.collection(ruleCollectionName).findOne({ name });
    if (!dmnRuleRecord) {
      throw new Error(`Unable to find dmn rule with name '${name}'`);
    }
    const { dmnXml, decisionId } = dmnRuleRecord.definition;
    const dmnUtilInstance = await getValidatedDmnUtilInstance(dmnXml, decisionId);
    const result = await processDmnVariables(dmnUtilInstance, _.castArray(variables));
    return _.isArray(variables) ? result : result[0];
  };

  m.aiml = (endpoint, variables) => {
    return getAimlResult(endpoint, variables, log);
  };

  return m;
}

module.exports = (context) => {
  return async (job) => {
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

    const { db, cache, log } = context.getCommonContext();
    const now = new Date();

    const engine = Engine({
      source: xml,
      moddleOptions: {
        camunda: require('camunda-bpmn-moddle/resources/camunda'),
      },
    });
    const listener = new EventEmitter();
    listener.on('activity.end', (elementApi, engineApi) => {
      if (elementApi.content.output) {
        engineApi.environment.output[elementApi.id] = elementApi.content.output;
      }
    });

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

    const services = getServices(db, log);
    let results = [];
    let initDocs = [];
    let processedVariables = 0;

    try {
      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        initDocs.push(doc);
        const mappedData = processDataMapping({ input: doc, dataMapping: inputDataMapping });

        // Besides passed value variables contains following meta info:
        // { "fields":{"routingKey":"run.execute","exchange":"run","consumerTag":"_process-run"},"content":{"id":"theProcess","type":"bpmn:Process","parent":{"type":"bpmn:Definitions"},"executionId":"theProcess_2a87960a"},"properties":{"messageId":"smq.mid-2b7178","timestamp":1587200146135}}
        const output = await new Promise((resolve, reject) => {
          engine.execute({ listener, variables: { data: mappedData, parameters }, services }, (err, _execution) => {
            if (err) {
              return reject(err);
            }
            resolve(_execution.environment.output);
          });
        });

        results.push(_.cloneDeep(output));
        if (results.length >= batchSize) {
          await processResults();
        }
      }
      results.length && (await processResults());

      await cache.clearCacheForModel(outputCollection);
    } catch (e) {
      log.error(`Unable to process a job with id ${job.id}`, e.stack);
    }

    async function processResults() {
      const resultRecords = [];

      _.each(results, (result, index) => {
        const initDoc = initDocs[index];
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
      });

      await upsertResultRecords({
        db,
        collection: outputCollection,
        resultRecords,
        $setOnInsert: { creator, createdAt: now },
      });

      processedVariables += initDocs.length;
      initDocs = [];
      results = [];
      const percentage = getPercentage(processedVariables, inputRecordsCount);
      job.progress(percentage);
    }
  };
};
