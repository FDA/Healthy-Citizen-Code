const _ = require('lodash');
const args = require('optimist').argv;
const Promise = require('bluebird');
const { mongoConnect, setUpdateAtIfRecordChanged } = require('../../../util/mongo');

const { mongoUrl, recallCollectionName, drugCollectionName } = args;

if (!mongoUrl || !recallCollectionName || !drugCollectionName) {
  console.log('Please specify params: mongoUrl, recallCollectionName, drugCollectionName');
  process.exit(1);
}

async function linkRecallToDrug(drugDoc, dbCon) {
  try {
    const {
      openfda: { splId, splSetId, packageNdc, productNdc },
    } = drugDoc;

    const $recallOrCondition = [];
    _.isArray(splId) && splId.length && $recallOrCondition.push({ 'openfda.splId': splId });
    _.isArray(splSetId) && splSetId.length && $recallOrCondition.push({ 'openfda.splSetId': splSetId });
    _.isArray(packageNdc) && packageNdc.length && $recallOrCondition.push({ packageNdc });
    _.isArray(productNdc) && productNdc.length && $recallOrCondition.push({ productNdc });

    const matchedRecallDocs = await dbCon
      .collection(recallCollectionName)
      .find(
        {
          $or: $recallOrCondition,
        },
        { projection: { _id: 1, recallNumber: 1 } }
      )
      .toArray();

    if (matchedRecallDocs.length) {
      const recallLookups = matchedRecallDocs.map(r => ({
        table: recallCollectionName,
        label: r.recallNumber,
        _id: r._id,
      }));

      await setUpdateAtIfRecordChanged(
        dbCon.collection(drugCollectionName), 'updateOne',
        { _id: drugDoc._id },
        { $set: { recalls: recallLookups } }
      );

      console.log(`Linked recalls: ${JSON.stringify(recallLookups)} to drug (mongo id: ${drugDoc._id})`);
    }
  } catch (e) {
    console.error(`Error while linking drug ${JSON.stringify(drugDoc)}`, e);
  }
}

async function createIndexes(indexFieldNames, collection, dbCon) {
  return Promise.map(indexFieldNames, fieldName => dbCon.collection(collection).createIndex({ [fieldName]: 1 }));
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    const recallIndexFieldNames = ['openfda.splId', 'openfda.splSetId', 'packageNdc', 'productNdc'];
    console.log(`Creating '${recallCollectionName}' DB Indexes: ${recallIndexFieldNames.join(', ')}`);
    await createIndexes(recallIndexFieldNames, recallCollectionName, dbCon);

    const drugIndexFieldNames = ['openfda.splId', 'openfda.splSetId', 'openfda.packageNdc', 'openfda.productNdc'];
    console.log(`Creating '${drugCollectionName}' DB Indexes: ${drugIndexFieldNames.join(', ')}`);
    await createIndexes(drugIndexFieldNames, drugCollectionName, dbCon);
    console.log(`DB Indexes created`);

    const drugCursor = await dbCon
      .collection(drugCollectionName)
      .find({
        $or: [
          { 'openfda.splId': { $exists: true, $ne: [] } },
          { 'openfda.splSetId': { $exists: true, $ne: [] } },
          { 'openfda.packageNdc': { $exists: true, $ne: [] } },
          { 'openfda.productNdc': { $exists: true, $ne: [] } },
        ],
      })
      .addCursorFlag('noCursorTimeout', true);

    console.log('Searching for Recalls matching Drugs.');
    let drugs = [];
    while (await drugCursor.hasNext()) {
      const drugDoc = await drugCursor.next();
      drugs.push(drugDoc);
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
