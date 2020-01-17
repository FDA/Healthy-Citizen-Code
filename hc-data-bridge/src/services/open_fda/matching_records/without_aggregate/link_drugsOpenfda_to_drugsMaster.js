const _ = require('lodash');
const args = require('optimist').argv;
const Promise = require('bluebird');
const { mongoConnect, setUpdateAtIfRecordChanged } = require('../../../util/mongo');
const { conditionForActualRecord } =  require('../../../util/mongo');

const { mongoUrl } = args;
const drugsOpenfdaCollectionName = args.drugsOpenfdaCollectionName || 'drugsOpenfda';
const drugsMasterCollectionName = args.drugsMasterCollectionName || 'drugsMaster';

if (!mongoUrl) {
  console.log(`Please specify params 'mongoUrl'`);
  process.exit(1);
}

function linkDrugOpenfdaToDrugsMaster(drugOpenfdaDoc, dbCon) {
  try {
    const { _id, products, splSetId } = drugOpenfdaDoc;
    const { name, packageNdc11s } = products[0];
    const drugOpenfdaLookup = {
      _id,
      table: drugsOpenfdaCollectionName,
      label: name,
    };

    return Promise.map(packageNdc11s, async ({ packageNdc11 }) => {
      const drugsMasterDoc = await dbCon.collection(drugsMasterCollectionName).findOne({ packageNdc11 });
      const now = new Date();
      if (!drugsMasterDoc) {
        return dbCon.collection(drugsMasterCollectionName).insertOne({
          ...conditionForActualRecord,
          name,
          packageNdc11,
          splSetId: [splSetId],
          links: { drugsOpenfda: [drugOpenfdaLookup] },
          createdAt: now,
          updatedAt: now,
        });
      }

      const links = drugsMasterDoc.links || {};
      if (_.isEmpty(links.spl) && _.isEmpty(links.ndc) && _.isEmpty(links.rxnormConso) && _.isEmpty(links.rxnormSat)) {
        return dbCon.collection(drugsMasterCollectionName).updateOne(
          { _id: drugsMasterDoc._id },
          {
            $set: {
              name,
              packageNdc11,
              updatedAt: now,
            },
            $addToSet: { splSetId, 'links.drugsOpenfda': drugOpenfdaLookup },
          }
        );
      }

      const linksOpenfda = links.drugsOpenfda || [];
      const isSplSetIdFound = drugsMasterDoc.splSetId.includes(splSetId);
      const isLinkFound = !!linksOpenfda.find(
        l => l._id === drugOpenfdaLookup._id && l.table === drugOpenfdaLookup.table
      );
      if (!isLinkFound || !isSplSetIdFound) {
        return setUpdateAtIfRecordChanged(
          dbCon.collection(drugsMasterCollectionName), 'updateOne',
          { _id: drugsMasterDoc._id },
          {
            $set: { updatedAt: now },
            $addToSet: { splSetId, 'links.drugsOpenfda': drugOpenfdaLookup },
          }
        );
      }
    });
  } catch (e) {
    console.error(`Error while linking drug ${JSON.stringify(drugOpenfdaDoc)}`, e);
  }
}

async function createIndexes(indexFieldNames, collection, dbCon) {
  return Promise.map(indexFieldNames, fieldName => dbCon.collection(collection).createIndex({ [fieldName]: 1 }));
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);

    const drugsMasterIndexFieldNames = ['packageNdc11'];
    console.log(`Creating '${drugsMasterCollectionName}' DB Indexes: ${drugsMasterIndexFieldNames.join(', ')}`);
    await createIndexes(drugsMasterIndexFieldNames, drugsMasterCollectionName, dbCon);
    console.log(`DB Indexes created`);

    const drugOpenfdaCursor = await dbCon
      .collection(drugsOpenfdaCollectionName)
      .find({}, { projection: { splSetId: 1, products: 1 } })
      .addCursorFlag('noCursorTimeout', true);

    console.log(`Linking Openfda drugs from '${drugsOpenfdaCollectionName}' to '${drugsMasterCollectionName}'.`);
    while (await drugOpenfdaCursor.hasNext()) {
      const drugOpenfdaDoc = await drugOpenfdaCursor.next();
      await linkDrugOpenfdaToDrugsMaster(drugOpenfdaDoc, dbCon);
    }

    console.log('\nDone');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred', e.stack);
    process.exit(1);
  }
})();
