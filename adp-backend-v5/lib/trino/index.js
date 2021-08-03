const _ = require('lodash');
const Promise = require('bluebird');
const { getTrinoTableName, getTrinoSchema, trinoCollectionName } = require('./util');
const { guessSchema } = require('./guess-schema');
const { datasetsModelName } = require('../graphql/datasets-collections/util');

module.exports = (appLib) => {
  const m = {};
  m.getTrinoSchemeWithTransformations = async (adpSchema) => {
    const trinoSchema = getTrinoSchema(adpSchema);
    const userContext = {};
    await appLib.transformers.preSaveTransformData(trinoCollectionName, userContext, trinoSchema, []);
    return trinoSchema;
  };

  m.upsertAllTrinoSchemas = async () => {
    const appSchemas = _.clone(_.values(appLib.appModel.models));
    const datasetRecords = await appLib.db
      .collection(datasetsModelName)
      .find(appLib.dba.getConditionForActualRecord(datasetsModelName))
      .toArray();
    const datasetSchemas = datasetRecords.map((record) => record.scheme);

    const allSchemas = [...appSchemas, ...datasetSchemas];
    await m.upsertTrinoSchemas(allSchemas);

    const allSchemaNames = allSchemas.map((schema) => schema.collectionName);
    const otherCollectionDocs = await appLib.db
      .listCollections({ name: { $nin: allSchemaNames } }, { nameOnly: true })
      .toArray();
    const otherCollectionNames = otherCollectionDocs.map((d) => d.name);

    const limit = appLib.config.TRINO_SCHEMA_GUESS_ROWS;
    let otherCollectionsAdpSchemas = await Promise.map(
      otherCollectionNames,
      async (collectionName) => {
        const collectionDocs = await appLib.db.collection(collectionName).find({}, { limit }).toArray();
        const adpSchema = guessSchema(collectionDocs);
        adpSchema.collectionName = collectionName;
        return adpSchema;
      },
      { concurrency: 10 }
    );
    otherCollectionsAdpSchemas = otherCollectionsAdpSchemas.filter((s) => s.fields);
    await m.upsertTrinoSchemas(otherCollectionsAdpSchemas);
  };

  m.upsertTrinoSchemas = async (adpSchemas) => {
    await Promise.map(_.values(adpSchemas), (adpSchema) => m.upsertTrinoSchema(adpSchema), { concurrency: 20 });
  };

  m.upsertTrinoSchema = async (adpSchema) => {
    const trinoSchema = await m.getTrinoSchemeWithTransformations(adpSchema);
    const { table } = trinoSchema;
    await appLib.db.collection(trinoCollectionName).replaceOne({ table }, trinoSchema, { upsert: true });
  };

  // Used for updating datasets which have changeable collectionName
  m.upsertTrinoSchemaForCollection = async (adpSchema, previousCollectionName) => {
    const previousTrinoTableName = getTrinoTableName(previousCollectionName);
    const trinoSchema = await m.getTrinoSchemeWithTransformations(adpSchema);
    await appLib.db
      .collection(trinoCollectionName)
      .replaceOne({ table: previousTrinoTableName }, trinoSchema, { upsert: true });
  };

  m.removeTrinoSchema = async (collectionName) => {
    const trinoTableName = getTrinoTableName(collectionName);
    await appLib.db.collection(trinoCollectionName).deleteOne({ table: trinoTableName });
  };

  return m;
};
