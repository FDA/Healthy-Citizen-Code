const _ = require('lodash');
const args = require('optimist').argv;
const Promise = require('bluebird');
const { mongoConnect, setUpdateAtIfRecordChanged } = require('../../../util/mongo');

const { mongoUrl } = args;
const recallCollectionName = args.recallCollectionName || 'recallsOpenfdaDrugs';
const drugsMasterCollectionName = args.drugsMasterCollectionName || 'drugsMaster';

if (!mongoUrl) {
  console.log(`Please specify params 'mongoUrl'`);
  process.exit(1);
}

async function linkRecallToDrugsMaster(recallDoc, dbCon) {
  try {
    const recallLookup = {
      table: recallCollectionName,
      label: recallDoc.eventId,
      _id: recallDoc._id,
    };
    const packageNdcs = recallDoc.packageNdc11s.map(obj => obj.packageNdc11);
    await setUpdateAtIfRecordChanged(
      dbCon.collection(drugsMasterCollectionName), 'updateMany',
      { packageNdc11: { $in: packageNdcs } },
      { $addToSet: { 'links.recallsOpenfda': recallLookup } }
    );
  } catch (e) {
    console.error(`Error while linking drug ${JSON.stringify(recallDoc)}`, e);
  }
}

async function createIndexes(indexFieldNames, collection, dbCon) {
  return Promise.map(indexFieldNames, fieldName => dbCon.collection(collection).createIndex({ [fieldName]: 1 }));
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    const recallIndexFieldNames = ['packageNdc11s.packageNdc11'];
    console.log(`Creating '${recallCollectionName}' DB Indexes: ${recallIndexFieldNames.join(', ')}`);
    await createIndexes(recallIndexFieldNames, recallCollectionName, dbCon);

    const drugsMasterIndexFieldNames = ['packageNdc11'];
    console.log(`Creating '${drugsMasterCollectionName}' DB Indexes: ${drugsMasterIndexFieldNames.join(', ')}`);
    await createIndexes(drugsMasterIndexFieldNames, drugsMasterCollectionName, dbCon);
    console.log(`DB Indexes created`);

    const recallCursor = await dbCon
      .collection(recallCollectionName)
      .find({ packageNdc11s: { $exists: true, $ne: [] } }, { projection: { eventId: 1, packageNdc11s: 1 } })
      .addCursorFlag('noCursorTimeout', true);

    console.log(`Linking recalls from '${recallCollectionName}' to '${drugsMasterCollectionName}'.`);
    while (await recallCursor.hasNext()) {
      const recallDoc = await recallCursor.next();
      await linkRecallToDrugsMaster(recallDoc, dbCon);
    }

    console.log('\nDone');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred', e.stack);
    process.exit(1);
  }
})();
