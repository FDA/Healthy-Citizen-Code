const Promise = require('bluebird');
const _ = require('lodash');
const args = require('optimist').argv;
const { mongoConnect, setUpdateAtIfRecordChanged } = require('../util/mongo');
const { loadRxcuiData } = require('./util');
const { conditionForActualRecord } =  require('../util/mongo');

const { mongoUrl } = args;
if (!mongoUrl) {
  console.log('Please specify mongoUrl');
  process.exit(1);
}

const rxnormSatCollectionName = args.rxnormSatCollectionName || 'drugsRxnormSat';
const rxnormConsoCollectionName = args.rxnormConsoCollectionName || 'drugsRxnormConso';
const drugsMasterCollectionName = args.drugsMasterCollectionName || 'drugsMaster';

async function createIndexes(dbCon) {
  await Promise.all([
    dbCon.collection(drugsMasterCollectionName).createIndex({ packageNdc11: 1 }),
    dbCon.collection(rxnormSatCollectionName).createIndex({ ndc11: 1 }),
  ]);
  console.log(
    `Created 'packageNdc11' index for '${drugsMasterCollectionName}'; 'ndc11' index for '${rxnormSatCollectionName}'`
  );
}

async function handleSatDoc(satDoc, dbCon, rxcuiData) {
  const { rxcui, ndc11: packageNdc11 } = satDoc;
  if (!rxcuiData[rxcui]) {
    // console.log(`Unable to find ingredients for rxcui=${rxcui}`);
    return;
  }
  const drugKey = `NDC11:${packageNdc11}`;
  const masterDocs = await dbCon
    .collection(drugsMasterCollectionName)
    .find({ packageNdc11 }, { projection: { _id: 1 } })
    .toArray();

  if (masterDocs.length > 1) {
    return console.warn(
      `Found 1+ docs with packageNdc11 '${packageNdc11}' in ${drugsMasterCollectionName}. This doc will be skipped.`
    );
  }

  const { rxCuis } = rxcuiData[rxcui];
  const rxnormSatLookup = {
    table: rxnormSatCollectionName,
    _id: satDoc._id,
    label: rxcui,
  };
  const productNdc11 = satDoc.productCode;
  const now = new Date();

  if (!masterDocs.length) {
    await dbCon.collection(drugsMasterCollectionName).insertOne({
      ...conditionForActualRecord,
      drugKey,
      packageNdc11,
      productNdc11,
      rxCuis,
      links: {
        rxnormSat: [rxnormSatLookup],
      },
      createdAt: now,
      updatedAt: now,
    });
    return console.log(`Inserted doc with packageNdc11=${packageNdc11}, rxcui=${rxcui}`);
  }

  const masterDoc = masterDocs[0];
  const { _id: masterDocId, rxCuis: masterDocRxCuis = [] } = masterDoc;

  _.each(rxCuis, rxCui => {
    const sameRxcuiTtyElem = masterDocRxCuis.find(el => el.tty === rxCui.tty && el.rxCui === rxCui.rxCui);
    !sameRxcuiTtyElem && masterDocRxCuis.push(rxCui);
  });
  const update = {
    $set: { drugKey, packageNdc11, productNdc11, rxCuis: masterDocRxCuis, updatedAt: now },
    $addToSet: { 'links.rxnormSat': rxnormSatLookup },
  };
  await setUpdateAtIfRecordChanged(dbCon.collection(drugsMasterCollectionName), 'updateOne', { _id: masterDocId }, update);
  console.log(`Updated doc with packageNdc11=${packageNdc11}, rxcui=${rxcui} for _id ${masterDocId.toString()}`);
}

async function linkRxnormSatToMaster(dbCon, rxcuiData) {
  const satCursor = dbCon
    .collection(rxnormSatCollectionName)
    .find({ ndc11: { $ne: null } }, { projection: { id: 1, rxcui: 1, productCode: 1, ndc11: 1 } });
  while (await satCursor.hasNext()) {
    const satDoc = await satCursor.next();
    await handleSatDoc(satDoc, dbCon, rxcuiData);
  }
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    await createIndexes(dbCon);
    const rxcuiData = await loadRxcuiData(dbCon, rxnormConsoCollectionName);
    await linkRxnormSatToMaster(dbCon, rxcuiData);
    console.log(`\nDone linking rxnormSat docs to ${drugsMasterCollectionName}`);
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while Rxnsat data', e);
    process.exit(1);
  }
})();
