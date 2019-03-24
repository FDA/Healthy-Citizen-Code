const _ = require('lodash');
const args = require('optimist').argv;
const Promise = require('bluebird');
const mongoConnect = Promise.promisify(require('mongodb').MongoClient.connect);

const { mongoUrl, recallCollectionName, drugCollectionName } = args;

if (!mongoUrl || !recallCollectionName || !drugCollectionName) {
  console.log('Please specify params: mongoUrl, recallCollectionName, drugCollectionName');
  process.exit(1);
}

async function linkRecallToDrug(doc, dbCon) {
  const recallLookups = doc.aggregateResult.map(recall => ({
    table: recallCollectionName,
    label: recall.recall_number,
    _id: recall._id,
  }));

  await dbCon.collection(drugCollectionName).update({ _id: doc._id }, { $set: { recallLookups } });

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
    const dbCon = await mongoConnect(mongoUrl, require('../../../util/mongo_connection_settings'));
    const recallIndexFieldNames = [
      'openfda.spl_id',
      'openfda.spl_set_id',
      'package_ndc',
      'product_ndc',
    ];
    console.log(`Creating Recall DB Indexes: ${recallIndexFieldNames.join(', ')}`);
    await createIndexes(recallIndexFieldNames, recallCollectionName, dbCon);

    const drugIndexFieldNames = [
      'openfda.spl_id',
      'openfda.spl_set_id',
      'openfda.package_ndc',
      'openfda.product_ndc',
    ];
    console.log(`Creating Drug DB Indexes: ${drugIndexFieldNames.join(', ')}`);
    await createIndexes(drugIndexFieldNames, drugCollectionName, dbCon);
    console.log(`DB Indexes created`);

    const pipeline = [
      {
        $lookup: {
          from: recallCollectionName,
          let: {
            spl_id: { $ifNull: ['$openfda.spl_id', []] },
            spl_set_id: { $ifNull: ['$openfda.spl_set_id', []] },
            package_ndc: { $ifNull: ['$openfda.package_ndc', []] },
            product_ndc: { $ifNull: ['$openfda.product_ndc', []] },
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    {
                      $size: {
                        $setIntersection: [{ $ifNull: ['$openfda.spl_id', []] }, '$$spl_id'],
                      },
                    },
                    {
                      $size: {
                        $setIntersection: [
                          { $ifNull: ['$openfda.spl_set_id', []] },
                          '$$spl_set_id',
                        ],
                      },
                    },
                    {
                      $size: {
                        $setIntersection: [{ $ifNull: ['$package_ndc', []] }, '$$package_ndc'],
                      },
                    },
                    {
                      $size: {
                        $setIntersection: [{ $ifNull: ['$product_ndc', []] }, '$$product_ndc'],
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
            recall_number: 1,
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
    //   const drugWithRecallRecord = await drugWithRecallCursor.next();
    //   await linkRecallToDrug(drugWithRecallRecord, dbCon);
    // }
    console.log('\nDone linking Recalls to Drugs');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while linking Recalls to Drugs', e);
    process.exit(1);
  }
})();
