const args = require('optimist').argv;
const _ = require('lodash');
const Promise = require('bluebird');
const { mongoConnect, setUpdateAtIfRecordChanged } = require('../../../util/mongo');

const { mongoUrl, aesCollectionName, deviceCollectionName } = args;

if (!mongoUrl || !aesCollectionName || !deviceCollectionName) {
  console.log('Please specify params: mongoUrl, aesCollectionName, deviceCollectionName');
  process.exit(1);
}

async function linkAeToDevice(deviceDoc, dbCon) {
  const {
    // applicant,
    // zipCode,
    deviceName,
  } = deviceDoc;

  // const applicantRegex = new RegExp(_.escapeRegExp(applicant), 'i');
  // const zipCodeRegex = new RegExp(_.escapeRegExp(zipCode), 'i');
  const deviceNameRegex = new RegExp(_.escapeRegExp(deviceName), 'i');

  const matchedAeDocs = await dbCon
    .collection(aesCollectionName)
    .find(
      {
        // $and: [
        //   { 'device.manufacturerDName': applicantRegex },
        //   { 'device.manufacturerDZipCode': zipCodeRegex },
        //   {
        $or: [
          { 'device.openfda.deviceName': deviceNameRegex },
          { 'device.brandName': deviceNameRegex },
          { 'device.genericName': deviceNameRegex },
        ],
        //   },
        // ],
      },
      { projection: { _id: 1, reportNumber: 1 } }
    )
    .toArray();

  if (matchedAeDocs.length) {
    const lookups = matchedAeDocs.map(ae => ({
      table: aesCollectionName,
      label: ae.reportNumber,
      _id: ae._id,
    }));
    await setUpdateAtIfRecordChanged(dbCon
      .collection(deviceCollectionName)
      , 'updateOne', { _id: deviceDoc._id }, { $set: { adverseEvents: lookups } });

    console.log(`Linked adverse events to device(kNumber: ${deviceDoc.kNumber}), lookups: ${JSON.stringify(lookups)}`);
  } else {
    // console.log(`Cannot find for applicant: ${deviceDoc.applicant}, zipCode: ${deviceDoc.zipCode}, deviceName: ${deviceDoc.deviceName}`);
  }
}

async function createIndexes(indexFieldNames, collection, dbCon) {
  return Promise.map(indexFieldNames, fieldName => dbCon.collection(collection).createIndex({ [fieldName]: 1 }));
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    const aeIndexFieldNames = [
      'device.manufacturerDName',
      'device.manufacturerDZipCode',
      'device.openfda.deviceName',
      'device.brandName',
      'device.genericName',
    ];
    console.log(`Creating '${aesCollectionName}' DB Indexes: ${aeIndexFieldNames.join(', ')}`);
    await createIndexes(aeIndexFieldNames, aesCollectionName, dbCon);
    console.log(`DB Indexes created`);

    const deviceCursor = await dbCon
      .collection(deviceCollectionName)
      .find()
      .addCursorFlag('noCursorTimeout', true);

    console.log('Searching for Adverse Events matching Devices.');
    let devices = [];
    while (await deviceCursor.hasNext()) {
      const deviceDoc = await deviceCursor.next();
      devices.push(deviceDoc);
      if (devices.length >= 500) {
        await Promise.map(devices, d => linkAeToDevice(d, dbCon));
        devices = [];
      }
    }
    await Promise.map(devices, d => linkAeToDevice(d, dbCon));

    console.log('\nDone linking Adverse Events to Devices');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while linking Adverse Events to Devices', e);
    process.exit(1);
  }
})();
