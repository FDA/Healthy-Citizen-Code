const _ = require('lodash');
const args = require('optimist').argv;
const Promise = require('bluebird');
const mongoConnect = Promise.promisify(require('mongodb').MongoClient.connect);

const { mongoUrl, aeCollectionName, deviceCollectionName } = args;

if (!mongoUrl || !aeCollectionName || !deviceCollectionName) {
  console.log('Please specify params: mongoUrl, aeCollectionName, deviceCollectionName');
  process.exit(1);
}

async function linkAeToDevice(doc, dbCon) {
  // if (_.isEmpty(doc.aggregateResult)) {
  //   return console.log(`No recalls for device with k_number: ${doc.k_number}`);
  // }
  const aeLookups = doc.aggregateResult.map(recall => ({
    table: aeCollectionName,
    label: recall.report_number,
    _id: recall._id,
  }));

  await dbCon
    .collection(deviceCollectionName)
    .update({ _id: doc._id }, { $set: { adverseEvents: aeLookups } });

  console.log(`Linked adverse events: ${JSON.stringify(aeLookups)} to device _id: ${doc._id.toString()}`);
}

async function createIndexes(indexFieldNames, collection, dbCon) {
  return Promise.map(indexFieldNames, fieldName =>
    dbCon.collection(collection).createIndex({ [fieldName]: 1 })
  );
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl, require('../../../util/mongo_connection_settings'));
    const deviceFieldNames = ['applicant', 'zip_code', 'device_name'];
    console.log(`Creating Device DB Indexes: ${deviceFieldNames.join(', ')}`);
    await createIndexes(deviceFieldNames, deviceCollectionName, dbCon);

    const aeIndexFieldNames = [
      'device.manufacturer_d_name',
      'device.manufacturer_d_zip_code',
      'openfda.device_name',
      'device.brand_name',
      'device.generic_name',
    ];
    console.log(`Creating Device DB Indexes: ${aeIndexFieldNames.join(', ')}`);
    await createIndexes(aeIndexFieldNames, aeCollectionName, dbCon);
    console.log(`DB Indexes created`);

    const pipeline = [
      {
        $lookup: {
          from: aeCollectionName,
          let: {
            applicant: '$applicant',
            zip_code: '$zip_code',
            device_name: '$device_name',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  and: [
                    { $eq: ['$$applicant', '$device.manufacturer_d_name'] },
                    { $eq: ['$$zip_code', '$device.manufacturer_d_zip_code'] },
                    {
                      $in: [
                        '$$device_name',
                        [
                          '$device.openfda.device_name',
                          '$device.brand_name',
                          '$device.generic_name',
                        ],
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: 'aggregateResult',
        },
      },
      {
        $match: {
          $expr: {
            $and: [{ $ne: [{ $size: '$aggregateResult' }, 0] }],
          },
        },
      },
      {
        $project: {
          _id: 1,
          k_number: 1,
          aggregateResult: {
            _id: 1,
            report_number: 1,
          },
        },
      },
    ];

    const deviceWithAeCursor = await dbCon.collection(deviceCollectionName).aggregate(pipeline);

    console.log('Searching for Adverse Events matching Devices.');
    while (await deviceWithAeCursor.hasNext()) {
      const deviceWithAeRecord = await deviceWithAeCursor.next();
      await linkAeToDevice(deviceWithAeRecord, dbCon);
    }
    console.log('\nDone linking Adverse Events to Devices');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while linking Adverse Events to Devices', e);
    process.exit(1);
  }
})();
