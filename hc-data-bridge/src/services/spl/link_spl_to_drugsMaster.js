const Promise = require('bluebird');
const args = require('optimist').argv;
const { mongoConnect, setUpdateAtIfRecordChanged } = require('../util/mongo');
const { conditionForActualRecord } =  require('../util/mongo');

const { mongoUrl } = args;
if (!mongoUrl) {
  console.log('Please specify mongoUrl');
  process.exit(1);
}

const splCollectionName = args.splCollectionName || 'spl';
const drugsMasterCollectionName = args.drugsMasterCollectionName || 'drugsMaster';

function createIndexes(dbCon) {
  return Promise.all([
    dbCon.collection(splCollectionName).createIndex({ productType: 1 }),
    // dbCon.collection(drugsMasterCollectionName).createIndex({ drugKey: 1 }),
    dbCon.collection(drugsMasterCollectionName).createIndex({ packageNdc11: 1 }),
  ]);
}

async function linkSplDrug(splDoc, dbCon) {
  const splLookup = {
    table: splCollectionName,
    _id: splDoc._id,
    label: splDoc.splSetId,
  };
  const products = splDoc.products || [];

  return Promise.mapSeries(products, ({ productNdc11, packageNdc11s, name }) => {
    const ndcs = packageNdc11s.map(obj => obj.packageNdc11);
    return Promise.mapSeries(ndcs, packageNdc11 =>
      dbCon
        .collection(drugsMasterCollectionName)
        .findOne({ packageNdc11 }, { projection: { createdAt: 1 } })
        .then(res => {
          const now = new Date();
          if (res) {
            const createdAt = res.createdAt || now;
            return setUpdateAtIfRecordChanged(
              dbCon.collection(drugsMasterCollectionName), 'updateOne',
              { _id: res._id },
              {
                $set: {
                  packageNdc11,
                  productNdc11,
                  name,
                  createdAt,
                },
                $addToSet: {
                  splId: splDoc.splId,
                  splSetId: splDoc.splSetId,
                  'links.spl': splLookup,
                },
              }
            );
          }
          return dbCon.collection(drugsMasterCollectionName).insertOne({
            ...conditionForActualRecord,
            packageNdc11,
            productNdc11,
            name,
            createdAt: now,
            updatedAt: now,
            splId: [splDoc.splId],
            splSetId: [splDoc.splSetId],
            links: { spl: [splLookup] },
          });
        })
    );
  });
}

async function linkSplDocsToMaster(dbCon) {
  const splDrugCursor = dbCon.collection(splCollectionName).find();
  while (await splDrugCursor.hasNext()) {
    const splDrug = await splDrugCursor.next();
    await linkSplDrug(splDrug, dbCon);
  }
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    await createIndexes(dbCon);
    await linkSplDocsToMaster(dbCon);

    console.log(`\nDone linking SPL data to ${drugsMasterCollectionName}`);
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while SPL data', e);
    process.exit(1);
  }
})();
