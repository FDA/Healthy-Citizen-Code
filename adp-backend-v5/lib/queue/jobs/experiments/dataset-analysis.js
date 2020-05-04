const _ = require('lodash');
const { ObjectID } = require('mongodb');
const { flattenObject } = require('../util');

async function analyzeDataset({ appLib, datasetCollectionName, datasetAnalysisSpecification, parameters }) {
  const { recordProcessingCode, normalizationCode } = datasetAnalysisSpecification;

  let recordProcessingFunction;
  let normalizationFunction;
  const funcArgs = [flattenObject, _, ObjectID];
  const args = `flattenObject, _, ObjectID`;
  try {
    normalizationFunction = new Function(args, normalizationCode);
    recordProcessingFunction = new Function(args, recordProcessingCode);
  } catch (e) {
    throw new Error(`Unable to generate datasetAnalysisSpecification functions. ${e.stack}`);
  }

  const cursor = appLib.db.collection(datasetCollectionName).aggregate([
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

  const output = {};
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const recordContext = { input: doc, output, parameters };
    await recordProcessingFunction.apply(recordContext, funcArgs);
  }

  const totalRecordCount = await appLib.db.collection(datasetCollectionName).countDocuments();
  const normalizationContext = { totalRecordCount, output, parameters };
  const metrics = await normalizationFunction.apply(normalizationContext, funcArgs);

  return metrics;
}

module.exports = {
  analyzeDataset,
};
