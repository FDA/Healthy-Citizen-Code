const fs = require('fs-extra');
const { EJSON } = require('bson');
const { ObjectId } = require('mongodb');

const { exportsModelName } = require('..');

const exportsFuncs = {
  csv: require('./export-types/export-csv'),
  excel: require('./export-types/export-excel'),
  json: require('./export-types/export-json'),
  xml: require('./export-types/export-xml'),
};

module.exports = (context) => {
  return async (job) => {
    const {
      fileId,
      projections,
      exportName,
      relativeFilePath,
      absoluteFilePath,
      collectionToExport,
      exportPipeline,
      exportType,
      timezone,
      exportRecordId,
      creator,
    } = job.data;
    const { appLib, log } = context.getCommonContext();

    if (!exportsFuncs[exportType]) {
      throw new Error(`Invalid exportType value - '${exportType}'`);
    }

    const scheme = appLib.appModel.models[collectionToExport];
    const options = { timezone };
    const fileExport = exportsFuncs[exportType]({ filePath: absoluteFilePath, scheme, projections, options });

    try {
      await fileExport.init();

      // userContext is req by default and therefore might not be serializable as json in redis job.
      // Current core transformers don't use userContext this is why it can be replaced with empty object
      const userContext = {};

      const pipeline = EJSON.parse(exportPipeline, { relaxed: true });
      const cursor = appLib.db.collection(collectionToExport).aggregate(pipeline);
      let records = [];
      for await (const record of cursor) {
        records.push(record);
        if (records.length >= 50) {
          await appLib.dba.postTransform(records, collectionToExport, userContext);
          await fileExport.add(records);
          records = [];
        }
      }

      if (records.length) {
        await appLib.dba.postTransform(records, collectionToExport, userContext);
        await fileExport.add(records);
      }

      await fileExport.finish();

      const [hash, stat] = await Promise.all([
        appLib.file.util.getFileHash(absoluteFilePath),
        fs.stat(absoluteFilePath),
      ]);
      const now = new Date();
      const fileRecord = {
        _id: ObjectId(fileId),
        originalName: `${exportName}.${fileExport.ext}`,
        size: stat.size,
        mimeType: fileExport.mimeType,
        hash,
        filePath: relativeFilePath,
        creator,
        deletedAt: new Date(0),
        createdAt: now,
        updatedAt: now,
      };
      const { filesCollectionName } = appLib.file.constants;
      await appLib.db.collection(filesCollectionName).hookQuery('insertOne', fileRecord, { checkKeys: false });

      const exportRecordUpdate = {
        file: {
          _id: fileRecord._id,
          table: filesCollectionName,
          label: fileRecord.originalName,
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
      await appLib.cache.clearCacheForModel(collectionToExport);
    }
  };
};
