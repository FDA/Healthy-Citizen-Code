const _ = require('lodash');
const args = require('optimist').argv;
const Promise = require('bluebird');
const { mongoConnect, setUpdateAtIfRecordChanged} = require('../../../util/mongo');

const { mongoUrl, recallCollectionName, deviceCollectionName } = args;

if (!mongoUrl || !recallCollectionName || !deviceCollectionName) {
  console.log('Please specify params: mongoUrl, recallCollectionName, deviceCollectionName');
  process.exit(1);
}

async function linkRecallToDevice(doc, dbCon) {
  // if (_.isEmpty(doc.aggregateResult)) {
  //   return console.log(`No recalls for device with kNumber: ${doc.kNumber}`);
  // }
  const recallLookups = doc.aggregateResult.map(recall => ({
    table: recallCollectionName,
    label: recall.resEventNumber,
    _id: recall._id,
  }));

  await setUpdateAtIfRecordChanged(dbCon
    .collection(deviceCollectionName)
    , 'updateOne', { _id: doc._id }, { $set: { recallLookups } });

  console.log(`Linked recalls: ${JSON.stringify(recallLookups)} to device _id: ${doc._id.toString()}`);
}

async function createIndexes(indexFieldNames, collection, dbCon) {
  return Promise.map(indexFieldNames, fieldName =>
    dbCon.collection(collection).createIndex({ [fieldName]: 1 })
  );
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    const recallIndexFieldNames = [
      'kNumbers',
    ];
    console.log(`Creating Recall DB Indexes: ${recallIndexFieldNames.join(', ')}`);
    await createIndexes(recallIndexFieldNames, recallCollectionName, dbCon);

    const deviceIndexFieldNames = [
      'kNumber',
    ];
    console.log(`Creating Device DB Indexes: ${deviceIndexFieldNames.join(', ')}`);
    await createIndexes(deviceIndexFieldNames, deviceCollectionName, dbCon);
    console.log(`DB Indexes created`);

    const pipeline = [
      {
        $lookup: {
          from: recallCollectionName,
          let: {
            kNumber: '$kNumber',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    {
                      $in: ['$$kNumber', '$kNumbers'],
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
            resEventNumber: 1,
          },
        },
      },
    ];

    const deviceWithRecallCursor = await dbCon.collection(deviceCollectionName).aggregate(pipeline);

    console.log('Searching for Recalls matching Devices.');
    while (await deviceWithRecallCursor.hasNext()) {
      const deviceWithRecallDoc = await deviceWithRecallCursor.next();
      await linkRecallToDevice(deviceWithRecallDoc, dbCon);
    }
    console.log('\nDone linking Recalls to Devices');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while linking Recalls to Devices', e);
    process.exit(1);
  }
})();
