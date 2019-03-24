/**
 * Current file links MedWatch data to openfda drug records.
 */

const args = require('optimist').argv;
const Promise = require('bluebird');
const mongoConnect = Promise.promisify(require('mongodb').MongoClient.connect);

const { mongoUrl } = args;
if (!mongoUrl) {
  console.log('Please specify mongoUrl');
  process.exit(1);
}

const deviceCollectionName = args.deviceCollectionName || 'device510k';
const medWatchCollectionName = args.medWatchCollectionName || 'medWatch';

async function linkMedWatchToDevice(medWatchDoc, dbCon) {
  const { productName } = medWatchDoc;
  const productWords = productName.split(' ');
  const firstWordIndex = productWords.findIndex(word => /[a-zA-Z]/.test(word));
  const firstWord = productWords[firstWordIndex];

  const matchedDrugRecords = await dbCon
    .collection(deviceCollectionName)
    .find(
      {
        $expr: {
          $or: [{ $eq: [firstWord, '$device_name'] }, { $eq: [firstWord, '$openfda.device_name'] }],
        },
      },
      { _id: 1 }
    )
    .toArray();

  if (matchedDrugRecords.length) {
    const medWatchLookup = {
      table: medWatchCollectionName,
      label: productName,
      _id: medWatchDoc._id,
    };
    await Promise.map(matchedDrugRecords, drug =>
      dbCon
        .collection(deviceCollectionName)
        .findOneAndUpdate({ _id: drug._id }, { $addToSet: { medWatch: medWatchLookup } })
    );
    const matchedDeviceRecordIds = matchedDrugRecords.map(d => d._id.toString()).join(', ');
    console.log(
      `MedWatch with productName '${productName}' is linked as 'medWatch' to device with following ids: ${matchedDeviceRecordIds}`
    );
  }
}

function createIndexes(indexFieldNames, dbCon) {
  return Promise.map(indexFieldNames, fieldName =>
    dbCon.collection(deviceCollectionName).createIndex({ [fieldName]: 1 })
  );
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl, require('../util/mongo_connection_settings'));
    const indexFieldNames = ['device_name', 'openfda.device_name'];
    await createIndexes(indexFieldNames, dbCon);
    console.log(`DB Indexes created: ${indexFieldNames.join(', ')}`);

    const medWatchCursor = await dbCon.collection(medWatchCollectionName).find();

    console.log('Searching for MedWatch data matching Devices.');
    while (await medWatchCursor.hasNext()) {
      const medWatchDoc = await medWatchCursor.next();
      await linkMedWatchToDevice(medWatchDoc, dbCon);
    }
    console.log('\nDone linking MedWatch data to Devices');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while linking MedWatch data to Devices', e);
    process.exit(1);
  }
})();
