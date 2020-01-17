const _ = require('lodash');
const args = require('optimist').argv;
const Promise = require('bluebird');
const { mongoConnect, setUpdateAtIfRecordChanged } = require('../../../util/mongo');

const { mongoUrl, recallCollectionName, deviceCollectionName } = args;

if (!mongoUrl || !recallCollectionName || !deviceCollectionName) {
  console.log('Please specify params: mongoUrl, recallCollectionName, deviceCollectionName');
  process.exit(1);
}

async function linkRecallToDevice(deviceDoc, dbCon) {
  const { kNumber } = deviceDoc;

  const matchedRecallDocs = await dbCon
    .collection(recallCollectionName)
    .find(
      {
        kNumbers: kNumber,
      },
      { projection: { _id: 1, resEventNumber: 1 } }
    )
    .toArray();

  if (matchedRecallDocs.length) {
    const recallLookups = matchedRecallDocs.map(recall => ({
      table: recallCollectionName,
      label: recall.resEventNumber,
      _id: recall._id,
    }));

    await setUpdateAtIfRecordChanged(dbCon
      .collection(deviceCollectionName)
      , 'updateOne', { _id: deviceDoc._id }, { $set: { recalls: recallLookups } });

    console.log(`Linked recalls: ${JSON.stringify(recallLookups)} to device _id: ${deviceDoc._id.toString()}`);
  }
}

async function createIndexes(indexFieldNames, collection, dbCon) {
  return Promise.map(indexFieldNames, fieldName => dbCon.collection(collection).createIndex({ [fieldName]: 1 }));
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    const recallIndexFieldNames = ['kNumbers'];
    console.log(`Creating '${recallCollectionName}' DB Indexes: ${recallIndexFieldNames.join(', ')}`);
    await createIndexes(recallIndexFieldNames, recallCollectionName, dbCon);

    const deviceIndexFieldNames = ['kNumber'];
    console.log(`Creating '${deviceCollectionName}' DB Indexes: ${deviceIndexFieldNames.join(', ')}`);
    await createIndexes(deviceIndexFieldNames, deviceCollectionName, dbCon);
    console.log(`DB Indexes created`);

    const devicesCursor = await dbCon
      .collection(deviceCollectionName)
      .find({}, { projection: { kNumber: 1 } })
      .addCursorFlag('noCursorTimeout', true);

    console.log('Searching for Recalls matching Devices.');
    let devices = [];
    while (await devicesCursor.hasNext()) {
      const deviceDoc = await devicesCursor.next();
      devices.push(deviceDoc);
      if (devices.length >= 500) {
        await Promise.map(devices, d => linkRecallToDevice(d, dbCon));
        devices = [];
      }
    }
    await Promise.map(devices, d => linkRecallToDevice(d, dbCon));

    console.log('\nDone linking Recalls to Devices');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while linking Recalls to Devices', e);
    process.exit(1);
  }
})();
