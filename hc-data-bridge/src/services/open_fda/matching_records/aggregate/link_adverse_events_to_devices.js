const _ = require('lodash');
const args = require('optimist').argv;
const Promise = require('bluebird');
const { mongoConnect, setUpdateAtIfRecordChanged } = require('../../../util/mongo');

const { mongoUrl, aesCollectionName, deviceCollectionName } = args;

if (!mongoUrl || !aesCollectionName || !deviceCollectionName) {
  console.log('Please specify params: mongoUrl, aesCollectionName, deviceCollectionName');
  process.exit(1);
}

async function linkAeToDevice(doc, dbCon) {
  // if (_.isEmpty(doc.aggregateResult)) {
  //   return console.log(`No recalls for device with k_number: ${doc.k_number}`);
  // }
  const aeLookups = doc.aggregateResult.map(recall => ({
    table: aesCollectionName,
    label: recall.reportNumber,
    _id: recall._id,
  }));

  await setUpdateAtIfRecordChanged(dbCon
    .collection(deviceCollectionName)
    , 'updateOne', { _id: doc._id }, { $set: { adverseEvents: aeLookups } });

  console.log(`Linked adverse events: ${JSON.stringify(aeLookups)} to device _id: ${doc._id.toString()}`);
}

async function createIndexes(indexFieldNames, collection, dbCon) {
  return Promise.map(indexFieldNames, fieldName =>
    dbCon.collection(collection).createIndex({ [fieldName]: 1 })
  );
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    const deviceFieldNames = ['applicant', 'zipCode', 'deviceName'];
    console.log(`Creating Device DB Indexes: ${deviceFieldNames.join(', ')}`);
    await createIndexes(deviceFieldNames, deviceCollectionName, dbCon);

    const aeIndexFieldNames = [
      'device.manufacturerDName',
      'device.manufacturerDZipCode',
      'device.openfda.deviceName',
      'device.brandName',
      'device.genericName',
    ];
    console.log(`Creating Device DB Indexes: ${aeIndexFieldNames.join(', ')}`);
    await createIndexes(aeIndexFieldNames, aesCollectionName, dbCon);
    console.log(`DB Indexes created`);

    const pipeline = [
      {
        $lookup: {
          from: aesCollectionName,
          let: {
            applicant: '$applicant',
            zipCode: '$zipCode',
            deviceName: '$deviceName',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  and: [
                    { $eq: ['$$applicant', '$device.manufacturerDName'] },
                    { $eq: ['$$zipCode', '$device.manufacturerDZipCode'] },
                    {
                      $in: [
                        'deviceName',
                        [
                          '$device.openfda.deviceName',
                          '$device.brandName',
                          '$device.genericName',
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
          kNumber: 1,
          aggregateResult: {
            _id: 1,
            reportNumber: 1,
          },
        },
      },
    ];

    const deviceWithAeCursor = await dbCon.collection(deviceCollectionName).aggregate(pipeline);

    console.log('Searching for Adverse Events matching Devices.');
    while (await deviceWithAeCursor.hasNext()) {
      const deviceWithAeDoc = await deviceWithAeCursor.next();
      await linkAeToDevice(deviceWithAeDoc, dbCon);
    }
    console.log('\nDone linking Adverse Events to Devices');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while linking Adverse Events to Devices', e);
    process.exit(1);
  }
})();
