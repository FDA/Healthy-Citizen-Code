const Promise = require('bluebird');
const _ = require('lodash');
const args = require('optimist').argv;
const { mongoConnect, setUpdateAtIfRecordChanged } = require('../util/mongo');

const resCollectionName = args.resCollectionName || 'recallsRes';
const drugsMasterCollectionName = args.drugsMasterCollectionName || 'drugsMaster';

const { mongoUrl } = args;
if (!mongoUrl) {
  console.log('Please specify mongoUrl');
  process.exit(1);
}

async function linkResDrugRecall(drugRecall, dbCon) {
  const recallResLookup = {
    table: resCollectionName,
    _id: drugRecall._id,
    label: drugRecall.eventId,
  };
  const extractedNdc11s = drugRecall.extractedNdc11s.map(obj => obj.extractedPackageNdc11);
  const drugMasterDocs = await dbCon
    .collection(drugsMasterCollectionName)
    .find({ packageNdc11: { $in: extractedNdc11s } }, { rxCuis: 1 })
    .toArray();
  if (_.isEmpty(drugMasterDocs)) {
    return;
  }

  const rxCuisForAllExtractedNdc11 = [];
  _.each(drugMasterDocs, doc => {
    const { rxCuis } = doc;
    _.each(rxCuis, rxCuiElem => {
      const hasSameRxcuiTtyElem = rxCuisForAllExtractedNdc11.find(
        el => el.tty === rxCuiElem.tty && el.rxCui === rxCuiElem.rxCui
      );
      !hasSameRxcuiTtyElem && rxCuisForAllExtractedNdc11.push(rxCuiElem);
    });
  });

  setUpdateAtIfRecordChanged(
    dbCon.collection(drugsMasterCollectionName), 'updateMany',
    // { drugKey: { $in: packageNdcs11.map(ndc => `NDC11:${ndc}`) } },
    { _id: { $in: drugMasterDocs.map(d => d._id) } },
    { $addToSet: { 'links.recallsConceptant': recallResLookup } }
  );

  if (!_.isEmpty(rxCuisForAllExtractedNdc11)) {
    setUpdateAtIfRecordChanged(
      dbCon.collection(drugsMasterCollectionName), 'updateOne',
      { _id: drugRecall._id },
      { $set: { rxCuis: rxCuisForAllExtractedNdc11 } }
    );
  }
}

async function linkResDocsToMaster(dbCon) {
  const drugRecallCursor = dbCon.collection(resCollectionName).find({ productType: 'drugs' });
  while (await drugRecallCursor.hasNext()) {
    const drugRecall = await drugRecallCursor.next();
    await linkResDrugRecall(drugRecall, dbCon);
  }
}

function createIndexes(dbCon) {
  return Promise.all([
    dbCon.collection(resCollectionName).createIndex({ productType: 1 }),
    // dbCon.collection(drugsMasterCollectionName).createIndex({ drugKey: 1 }),
    dbCon.collection(drugsMasterCollectionName).createIndex({ packageNdc11: 1 }),
  ]);
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    await createIndexes(dbCon);
    await linkResDocsToMaster(dbCon);

    console.log(`\nDone linking RES recalls data to ${drugsMasterCollectionName}`);
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while pumping RES data', e);
    process.exit(1);
  }
})();
