const _ = require('lodash');
const args = require('optimist').argv;
const Promise = require('bluebird');
const { mongoConnect, setUpdateAtIfRecordChanged} = require('../../../util/mongo');

const { mongoUrl, recallCollectionName, drugCollectionName } = args;

if (!mongoUrl || !recallCollectionName || !drugCollectionName) {
  console.log('Please specify params: mongoUrl, recallCollectionName, drugCollectionName');
  process.exit(1);
}

async function linkRecallToDrug(doc, dbCon) {
  const recallLookups = doc.aggregateResult.map(recall => ({
    table: recallCollectionName,
    label: recall.recallNumber,
    _id: recall._id,
  }));

  await setUpdateAtIfRecordChanged(dbCon.collection(drugCollectionName), 'updateOne', { _id: doc._id }, { $set: { recallLookups } });

  console.log(
    `Linked recalls: ${JSON.stringify(recallLookups)} to drug _id: ${doc._id.toString()}`
  );
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
      'openfda.splId',
      'openfda.splSetId',
      'packageNdc',
      'productNdc',
    ];
    console.log(`Creating Recall DB Indexes: ${recallIndexFieldNames.join(', ')}`);
    await createIndexes(recallIndexFieldNames, recallCollectionName, dbCon);

    const drugIndexFieldNames = [
      'openfda.splId',
      'openfda.splSetId',
      'openfda.packageNdc',
      'openfda.productNdc',
    ];
    console.log(`Creating Drug DB Indexes: ${drugIndexFieldNames.join(', ')}`);
    await createIndexes(drugIndexFieldNames, drugCollectionName, dbCon);
    console.log(`DB Indexes created`);

    const pipeline = [
      {
        $lookup: {
          from: recallCollectionName,
          let: {
            splId: { $ifNull: ['$openfda.splId', []] },
            splSetId: { $ifNull: ['$openfda.splSetId', []] },
            packageNdc: { $ifNull: ['$openfda.packageNdc', []] },
            productNdc: { $ifNull: ['$openfda.productNdc', []] },
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    {
                      $size: {
                        $setIntersection: [{ $ifNull: ['$openfda.splId', []] }, '$$splId'],
                      },
                    },
                    {
                      $size: {
                        $setIntersection: [
                          { $ifNull: ['$openfda.splSetId', []] },
                          '$$splSetId',
                        ],
                      },
                    },
                    {
                      $size: {
                        $setIntersection: [{ $ifNull: ['$packageNdc', []] }, '$$packageNdc'],
                      },
                    },
                    {
                      $size: {
                        $setIntersection: [{ $ifNull: ['$productNdc', []] }, '$$productNdc'],
                      },
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
          aggregateResult: {
            _id: 1,
            recallNumber: 1,
          },
        },
      },
    ];

    const drugWithRecallCursor = await dbCon.collection(drugCollectionName).aggregate(pipeline);

    console.log('Searching for Recalls matching Drugs.');
    drugWithRecallCursor.forEach(async doc => {
      await linkRecallToDrug(doc, dbCon);
    });
    // while (await drugWithRecallCursor.hasNext()) {
    //   const drugWithRecallDoc = await drugWithRecallCursor.next();
    //   await linkRecallToDrug(drugWithRecallDoc, dbCon);
    // }
    console.log('\nDone linking Recalls to Drugs');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while linking Recalls to Drugs', e);
    process.exit(1);
  }
})();
