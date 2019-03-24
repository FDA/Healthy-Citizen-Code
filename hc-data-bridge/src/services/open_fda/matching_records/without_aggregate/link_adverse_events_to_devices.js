const args = require('optimist').argv;
const _ = require('lodash');
const Promise = require('bluebird');
const mongoConnect = Promise.promisify(require('mongodb').MongoClient.connect);

const { mongoUrl, aeCollectionName, deviceCollectionName } = args;

if (!mongoUrl || !aeCollectionName || !deviceCollectionName) {
  console.log('Please specify params: mongoUrl, aeCollectionName, deviceCollectionName');
  process.exit(1);
}

async function linkAeToDevice(deviceDoc, dbCon) {
  const {
    // applicant,
    // zip_code,
    device_name,
  } = deviceDoc;

  // const applicantRegex = new RegExp(_.escapeRegExp(applicant), 'i');
  // const zipCodeRegex = new RegExp(_.escapeRegExp(zip_code), 'i');
  const deviceNameRegex = new RegExp(_.escapeRegExp(device_name), 'i');

  const matchedAeRecords = await dbCon
    .collection(aeCollectionName)
    .find(
      {
        // $and: [
        //   { 'device.manufacturer_d_name': applicantRegex },
        //   { 'device.manufacturer_d_zip_code': zipCodeRegex },
        //   {
        $or: [
          { 'device.openfda.device_name': deviceNameRegex },
          { 'device.brand_name': deviceNameRegex },
          { 'device.generic_name': deviceNameRegex },
        ],
        //   },
        // ],
      },
      { _id: 1, report_number: 1 }
    )
    .toArray();

  if (matchedAeRecords.length) {
    const lookups = matchedAeRecords.map(ae => ({
      table: aeCollectionName,
      label: ae.report_number,
      _id: ae._id,
    }));
    await dbCon
      .collection(deviceCollectionName)
      .findOneAndUpdate({ _id: deviceDoc._id }, { $set: { adverseEvents: lookups } });

    console.log(
      `Linked adverse events to device(k_number: ${deviceDoc.k_number}), lookups: ${JSON.stringify(
        lookups
      )}`
    );
  } else {
    // console.log(`Cannot find for applicant: ${deviceDoc.applicant}, zip_code: ${deviceDoc.zip_code}, device_name: ${deviceDoc.device_name}`);
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
    const aeIndexFieldNames = [
      'device.manufacturer_d_name',
      'device.manufacturer_d_zip_code',
      'device.openfda.device_name',
      'device.brand_name',
      'device.generic_name',
    ];
    console.log(`Creating '${aeCollectionName}' DB Indexes: ${aeIndexFieldNames.join(', ')}`);
    await createIndexes(aeIndexFieldNames, aeCollectionName, dbCon);
    console.log(`DB Indexes created`);

    const deviceCursor = await dbCon
      .collection(deviceCollectionName)
      .find()
      .addCursorFlag('noCursorTimeout', true);

    console.log('Searching for Adverse Events matching Devices.');
    let devices = [];
    while (await deviceCursor.hasNext()) {
      const deviceRecord = await deviceCursor.next();
      devices.push(deviceRecord);
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
