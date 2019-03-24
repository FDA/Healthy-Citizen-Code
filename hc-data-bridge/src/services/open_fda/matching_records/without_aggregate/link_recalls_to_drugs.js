const _ = require('lodash');
const args = require('optimist').argv;
const Promise = require('bluebird');
const mongoConnect = Promise.promisify(require('mongodb').MongoClient.connect);

const { mongoUrl, recallCollectionName, drugCollectionName } = args;

if (!mongoUrl || !recallCollectionName || !drugCollectionName) {
  console.log('Please specify params: mongoUrl, recallCollectionName, drugCollectionName');
  process.exit(1);
}

async function linkRecallToDrug(drugDoc, dbCon) {
  try {
    const {
      openfda: { spl_id, spl_set_id, package_ndc, product_ndc },
    } = drugDoc;

    const $recallOrCondition = [];
    _.isArray(spl_id) && spl_id.length && $recallOrCondition.push({ 'openfda.spl_id': spl_id });
    _.isArray(spl_set_id) &&
      spl_set_id.length &&
      $recallOrCondition.push({ 'openfda.spl_set_id': spl_set_id });
    _.isArray(package_ndc) && package_ndc.length && $recallOrCondition.push({ package_ndc });
    _.isArray(product_ndc) && product_ndc.length && $recallOrCondition.push({ product_ndc });

    const matchedRecallRecords = await dbCon
      .collection(recallCollectionName)
      .find(
        {
          $or: $recallOrCondition,
        },
        { _id: 1, recall_number: 1 }
      )
      .toArray();

    if (matchedRecallRecords.length) {
      const recallLookups = matchedRecallRecords.map(r => ({
        table: recallCollectionName,
        label: r.recall_number,
        _id: r._id,
      }));

      await dbCon
        .collection(drugCollectionName)
        .findOneAndUpdate({ _id: drugDoc._id }, { $set: { recalls: recallLookups } });

      console.log(
        `Linked recalls: ${JSON.stringify(recallLookups)} to drug (mongo id: ${drugDoc._id})`
      );
    }
  } catch (e) {
    console.error(`Error while linking drug ${JSON.stringify(drugDoc)}`, e);
  }
}

async function createIndexes(indexFieldNames, collection, dbCon) {
  return Promise.map(indexFieldNames, fieldName =>
    dbCon.collection(collection).createIndex({ [fieldName]: 1 })
  );
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl, require('../../../util/mongo_connection_settings'));
    const recallIndexFieldNames = [
      'openfda.spl_id',
      'openfda.spl_set_id',
      'package_ndc',
      'product_ndc',
    ];
    console.log(
      `Creating '${recallCollectionName}' DB Indexes: ${recallIndexFieldNames.join(', ')}`
    );
    await createIndexes(recallIndexFieldNames, recallCollectionName, dbCon);

    const drugIndexFieldNames = [
      'openfda.spl_id',
      'openfda.spl_set_id',
      'openfda.package_ndc',
      'openfda.product_ndc',
    ];
    console.log(`Creating '${drugCollectionName}' DB Indexes: ${drugIndexFieldNames.join(', ')}`);
    await createIndexes(drugIndexFieldNames, drugCollectionName, dbCon);
    console.log(`DB Indexes created`);

    const drugCursor = await dbCon
      .collection(drugCollectionName)
      .find({
        $or: [
          { 'openfda.spl_id': { $exists: true, $ne: [] } },
          { 'openfda.spl_set_id': { $exists: true, $ne: [] } },
          { 'openfda.package_ndc': { $exists: true, $ne: [] } },
          { 'openfda.product_ndc': { $exists: true, $ne: [] } },
        ],
      })
      .addCursorFlag('noCursorTimeout', true);

    console.log('Searching for Recalls matching Drugs.');
    let drugs = [];
    while (await drugCursor.hasNext()) {
      const drugRecord = await drugCursor.next();
      drugs.push(drugRecord);
      if (drugs.length >= 500) {
        await Promise.map(drugs, d => linkRecallToDrug(d, dbCon));
        drugs = [];
      }
    }
    await Promise.map(drugs, d => linkRecallToDrug(d, dbCon));

    console.log('\nDone linking Recalls to Drugs');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while linking Recalls to Drugs', e);
    process.exit(1);
  }
})();
