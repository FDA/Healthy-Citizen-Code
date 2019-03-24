const _ = require('lodash');
const args = require('optimist').argv;
const Promise = require('bluebird');
const mongoConnect = Promise.promisify(require('mongodb').MongoClient.connect);

const { mongoUrl, recallCollectionName, deviceCollectionName } = args;

if (!mongoUrl || !recallCollectionName || !deviceCollectionName) {
  console.log('Please specify params: mongoUrl, recallCollectionName, deviceCollectionName');
  process.exit(1);
}

async function linkRecallToDevice(doc, dbCon) {
  // if (_.isEmpty(doc.aggregateResult)) {
  //   return console.log(`No recalls for device with k_number: ${doc.k_number}`);
  // }
  const recallLookups = doc.aggregateResult.map(recall => ({
    table: recallCollectionName,
    label: recall.res_event_number,
    _id: recall._id,
  }));

  await dbCon
    .collection(deviceCollectionName)
    .update({ _id: doc._id }, { $set: { recallLookups } });

  console.log(`Linked recalls: ${JSON.stringify(recallLookups)} to device _id: ${doc._id.toString()}`);
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
      'k_numbers',
    ];
    console.log(`Creating Recall DB Indexes: ${recallIndexFieldNames.join(', ')}`);
    await createIndexes(recallIndexFieldNames, recallCollectionName, dbCon);

    const deviceIndexFieldNames = [
      'k_number',
    ];
    console.log(`Creating Device DB Indexes: ${deviceIndexFieldNames.join(', ')}`);
    await createIndexes(deviceIndexFieldNames, deviceCollectionName, dbCon);
    console.log(`DB Indexes created`);

    const pipeline = [
      {
        $lookup: {
          from: recallCollectionName,
          let: {
            k_number: '$k_number',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    {
                      $in: ['$$k_number', '$k_numbers'],
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
            res_event_number: 1,
          },
        },
      },
    ];

    const deviceWithRecallCursor = await dbCon.collection(deviceCollectionName).aggregate(pipeline);

    console.log('Searching for Recalls matching Devices.');
    while (await deviceWithRecallCursor.hasNext()) {
      const deviceWithRecallRecord = await deviceWithRecallCursor.next();
      await linkRecallToDevice(deviceWithRecallRecord, dbCon);
    }
    console.log('\nDone linking Recalls to Devices');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while linking Recalls to Devices', e);
    process.exit(1);
  }
})();
