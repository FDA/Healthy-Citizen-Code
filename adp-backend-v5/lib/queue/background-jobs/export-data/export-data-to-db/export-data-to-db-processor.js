const { EJSON } = require('bson');
const { ObjectId } = require('mongodb');
const {
  addQueriesAndMutationsForDatasetsRecord,
  datasetsModelName,
} = require('../../../../graphql/datasets-collections/util');
const { exportsModelName } = require('..');

module.exports = (context) => async (job) => {
  const { datasetId, outCollectionName, outputPipeline, parentCollectionName, exportRecordId } = job.data;
  const { appLib, log } = context.getCommonContext();
  const { updateDatasetExpirationTimeout } = require('../../../../graphql/datasets-collections')({ appLib });

  try {
    const pipeline = EJSON.parse(outputPipeline, { relaxed: true });
    await appLib.db.collection(parentCollectionName).aggregate(pipeline).toArray();

    const datasetRecord = await appLib.db.collection(datasetsModelName).findOne({ _id: ObjectId(datasetId) });
    await addQueriesAndMutationsForDatasetsRecord(appLib, datasetRecord);
    updateDatasetExpirationTimeout(datasetRecord);
    appLib.graphQl.connect.rebuildGraphQlSchema();

    const exportRecordUpdate = {
      dataset: {
        _id: ObjectId(datasetRecord._id),
        table: datasetsModelName,
        label: datasetRecord.name,
      },
      queueName: job.queue.name,
      jobId: job.id,
    };
    await appLib.db
      .collection(exportsModelName)
      .updateOne({ _id: ObjectId(exportRecordId) }, { $set: exportRecordUpdate });
    await appLib.cache.clearCacheForModel(exportsModelName);
  } catch (e) {
    log.error(e.stack);
  } finally {
    await appLib.cache.clearCacheForModel(outCollectionName);
  }
};
