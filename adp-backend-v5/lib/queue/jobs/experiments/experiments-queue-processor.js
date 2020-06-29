const { ObjectID } = require('mongodb');
const Promise = require('bluebird');
const _ = require('lodash');
const { getSchemeFieldsByOutputs, getLookupDoc } = require('../util');
const { runDmnRule, ruleCollectionName } = require('../dmn');
const { runBpmnProcess, bpmnProcessesCollectionName } = require('../bpmn');
const { runAimlModel, aimlModelsCollectionName } = require('../aiml');
const { addQueriesAndMutationsForDatasetsRecord } = require('../../../graphql/datasets-collections/util');
const { analyzeDataset } = require('./dataset-analysis');
const { experimentsCollectionName } = require('./');

const collectionNameToJobRunner = {
  [ruleCollectionName]: runDmnRule,
  [bpmnProcessesCollectionName]: runBpmnProcess,
  [aimlModelsCollectionName]: runAimlModel,
};

async function getModelsJobInfo(modelInfo, appLib, log) {
  const result = {};
  await Promise.map(_.entries(modelInfo), async ([key, val]) => {
    const { modelDoc, modelCollectionName, inputDataMappingLookup, parametersLookup } = val;
    const { outputDataMapping: outputDataMappingLookup } = modelDoc;
    const jobRunner = collectionNameToJobRunner[modelCollectionName];
    if (!jobRunner) {
      return log.warn(`Unable to find jobRunner for model '${modelCollectionName}'`);
    }

    const [inputDataMapping, outputDataMapping, params] = await Promise.all([
      getLookupDoc(appLib, inputDataMappingLookup),
      getLookupDoc(appLib, outputDataMappingLookup),
      getModelParameters(appLib, parametersLookup),
    ]);

    result[modelCollectionName] = {
      jobRunner,
      jobParams: {
        _id: modelDoc._id,
        outputPrefix: key,
        inputDataMapping,
        outputDataMapping,
        parameters: params,
      },
    };
  });
  return result;
}

async function getModelParameters(appLib, paramsLookup) {
  const doc = await getLookupDoc(appLib, paramsLookup);
  if (!doc) {
    return {};
  }

  const { parameters } = doc;
  const result = {};
  _.each(parameters, (paramObj) => {
    const key = paramObj.name;
    if (paramObj.type === 'string') {
      result[key] = paramObj.stringValue;
    } else if (paramObj.type === 'number') {
      result[key] = paramObj.numberValue;
    } else if (paramObj.type === 'boolean') {
      result[key] = paramObj.booleanValue;
    }
  });
  return result;
}

async function getOutputDatasetScheme({ modelInfo, appLib, inputDataset, datasetName /* outputCollection */ }) {
  const inputRecord = await getLookupDoc(appLib, inputDataset, { scheme: 1 });
  // input scheme is already flattened, bring it as is
  const inputScheme = _.get(inputRecord, 'scheme');
  if (!inputScheme) {
    throw new Error(
      `Unable to find inputScheme by inputDataset '${JSON.stringify(
        inputDataset
      )}' to create output dataset scheme for dataset '${datasetName}'`
    );
  }

  // not processing recursively since input scheme fields are of 1 depth level
  const ignoredFields = ['_id', 'creator', 'createdAt', 'updatedAt', 'deletedAt'];
  _.each(inputScheme.fields, (f) => {
    if (ignoredFields.includes(f.fieldName)) {
      return;
    }
    const isInvisible = !_.get(f, 'parameters.visible');
    if (isInvisible) {
      _.set(f, 'parameters.visible', true);
    }
  });

  const modelsFields = await Promise.map(_.entries(modelInfo), async ([key, val]) => {
    const { modelDoc } = val;
    const outputsLookup = _.get(modelDoc, 'outputs');
    const outputsDoc = await getLookupDoc(appLib, outputsLookup);
    if (!outputsDoc) {
      return {};
    }
    // for example if model outputs is { score: { type: Number } } then result scheme will contain single field with name `${key}_score`
    return getSchemeFieldsByOutputs(outputsDoc.outputs, key);
  });

  const mergedScheme = inputScheme;
  _.each(modelsFields, (modelFields) => {
    _.merge(mergedScheme.fields, modelFields);
  });
  mergedScheme.fullName = datasetName;

  // Drop validation for now since it does not work properly (need to refactor validateAndCleanupAppModel to clear function or create new one)
  // const { validateAndCleanupAppModel } = appLib.mutil;
  // // validateAndCleanupAppModel considers that ALL models are in appLib.appModel.models
  // appLib.appModel.models[outputCollection] = mergedScheme;
  // let validationResult;
  // try {
  //   validationResult = validateAndCleanupAppModel({ [outputCollection]: mergedScheme });
  // } catch (e) {
  //   delete appLib.appModel.models[outputCollection];
  //   throw new Error(
  //     `Unable to validateAndCleanupAppModel merged dataset scheme ${datasetName}. Scheme=${JSON.stringify(
  //       mergedScheme
  //     )}. ${e.stack}`
  //   );
  // }
  // const errors = _.get(validationResult, 'errors', []);
  // if (errors.length) {
  //   throw new Error(errors.join('\n'));
  // }

  return mergedScheme;
}

module.exports = (context) => {
  return async (job) => {
    const { experiment, creator, outputCollection, inputCollectionName, inputRecordsCount } = job.data;
    creator._id = ObjectID(creator._id);

    const { appLib, log } = context.getCommonContext();
    const { models, outputDataset, inputDataset } = experiment;
    const { db } = appLib;

    // Get structure { [outputPrefix] : { modelDoc: {...}, modelCollectionName, inputDataMapping, parameters } }
    const modelValues = await Promise.map(
      _.values(models),
      async ({ model: modelLookup, inputDataMapping, parameters }) => ({
        modelDoc: await getLookupDoc(appLib, modelLookup),
        modelCollectionName: modelLookup.table,
        inputDataMappingLookup: inputDataMapping,
        parametersLookup: parameters,
      })
    );
    const modelInfo = _.zipObject(_.keys(models), modelValues);

    const { _id, table: datasetCollectionName, label: datasetName } = outputDataset;
    const outputDatasetScheme = await getOutputDatasetScheme({
      modelInfo,
      appLib,
      inputDataset,
      outputCollection,
      datasetName,
    });

    if (!_.isEmpty(outputDatasetScheme)) {
      try {
        const { value: updatedDatasetRecord } = await db
          .collection(datasetCollectionName)
          .findOneAndUpdate(
            { _id: ObjectID(_id) },
            { $set: { scheme: outputDatasetScheme } },
            { returnOriginal: false, new: true }
          );

        await appLib.cache.clearCacheForModel(datasetCollectionName);

        const { addDefaultQueries, addDefaultMutations, connect } = appLib.graphQl;
        await addQueriesAndMutationsForDatasetsRecord(
          updatedDatasetRecord,
          appLib,
          addDefaultQueries,
          addDefaultMutations
        );
        connect.rebuildGraphQlSchema();
      } catch (e) {
        throw new Error(
          `Unable to add queries and mutations for new dataset record with name '${datasetName}', collection '${outputCollection}': ${e.message}`
        );
      }
    }

    const modelsRunnerInfo = await getModelsJobInfo(modelInfo, appLib, log);
    const modelJobs = [];
    const commonParams = {
      creator,
      appLib,
      log,
      inputCollectionName,
      inputRecordsCount,
      outputCollection,
    };

    await Promise.map(_.entries(modelsRunnerInfo), async ([modelName, jobInfo]) => {
      const { jobRunner, jobParams } = jobInfo;
      const { success, data: dmnData, message } = await jobRunner({
        ...commonParams,
        ...jobParams,
      });
      if (success === true) {
        const modelJob = await appLib.queue.getJob(dmnData.queueName, dmnData.jobId);
        return modelJobs.push(modelJob);
      }
      const errMessage = `Unable to run job with id ${job.id} for model '${modelName}': ${message}`;
      log.error(errMessage);
      throw new Error(errMessage);
    });

    let experimentProgress = 1;
    job.progress(experimentProgress);
    const jobProgressIncrement = 99 / modelJobs.length;

    await Promise.map(modelJobs, async (modelJob) => {
      try {
        await modelJob.finished();
      } catch (e) {
        throw new Error(
          `Error occurred during running model job with id ${modelJob.id} in queue '${modelJob.queue.name}'`
        );
      }
      experimentProgress += jobProgressIncrement;
      job.progress(experimentProgress);
    });
    await appLib.cache.clearCacheForModel(outputCollection);

    const { datasetAnalysisSpecification } = experiment;
    const datasetAnalysisSpecificationDoc = await getLookupDoc(appLib, datasetAnalysisSpecification);
    if (datasetAnalysisSpecificationDoc) {
      try {
        const outputMetrics = await analyzeDataset({
          appLib,
          datasetCollectionName: outputCollection,
          datasetAnalysisSpecification: datasetAnalysisSpecificationDoc,
          parameters: { experiment },
        });
        await db
          .collection(experimentsCollectionName)
          .updateOne({ _id: ObjectID(experiment._id) }, { $set: { outputMetrics } });
        await appLib.cache.clearCacheForModel(experimentsCollectionName);
      } catch (e) {
        throw new Error(`Error occurred during analyzing dataset. ${e.stack}`);
      }
    }
  };
};
