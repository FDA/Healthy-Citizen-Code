const _ = require('lodash');
const args = require('optimist').argv;
const Promise = require('bluebird');
const mongoConnect = Promise.promisify(require('mongodb').MongoClient.connect);

const { mongoUrl, recallCollectionName, deviceCollectionName } = args;

if (!mongoUrl || !recallCollectionName || !deviceCollectionName) {
  console.log('Please specify params: mongoUrl, recallCollectionName, deviceCollectionName');
  process.exit(1);
}

async function linkRecallToDevice(deviceDoc, dbCon) {
  const { k_number } = deviceDoc;

  const matchedRecallRecords = await dbCon
    .collection(recallCollectionName)
    .find(
      {
        k_numbers: k_number,
      },
      { _id: 1, res_event_number: 1 }
    )
    .toArray();

  if (matchedRecallRecords.length) {
    const recallLookups = matchedRecallRecords.map(recall => ({
      table: recallCollectionName,
      label: recall.res_event_number,
      _id: recall._id,
    }));

    await dbCon
      .collection(deviceCollectionName)
      .update({ _id: deviceDoc._id }, { $set: { recalls: recallLookups } });

    console.log(
      `Linked recalls: ${JSON.stringify(recallLookups)} to device _id: ${deviceDoc._id.toString()}`
    );
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
    const recallIndexFieldNames = ['k_numbers'];
    console.log(
      `Creating '${recallCollectionName}' DB Indexes: ${recallIndexFieldNames.join(', ')}`
    );
    await createIndexes(recallIndexFieldNames, recallCollectionName, dbCon);

    const deviceIndexFieldNames = ['k_number'];
    console.log(
      `Creating '${deviceCollectionName}' DB Indexes: ${deviceIndexFieldNames.join(', ')}`
    );
    await createIndexes(deviceIndexFieldNames, deviceCollectionName, dbCon);
    console.log(`DB Indexes created`);

    const devicesCursor = await dbCon
      .collection(deviceCollectionName)
      .find({}, { k_number: 1 })
      .addCursorFlag('noCursorTimeout', true);

    console.log('Searching for Recalls matching Devices.');
    let devices = [];
    while (await devicesCursor.hasNext()) {
      const deviceRecord = await devicesCursor.next();
      devices.push(deviceRecord);
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
