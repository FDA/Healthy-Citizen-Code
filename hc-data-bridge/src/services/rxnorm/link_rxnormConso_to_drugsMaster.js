const Promise = require('bluebird');
const args = require('optimist').argv;
const { ObjectId } = require('mongodb');
const { mongoConnect, setUpdateAtIfRecordChanged } = require('../util/mongo');
const { conditionForActualRecord } =  require('../util/mongo');

const { mongoUrl } = args;
if (!mongoUrl) {
  console.log('Please specify mongoUrl');
  process.exit(1);
}

const rxnormConsoCollectionName = args.rxnormConsoCollectionName || 'drugsRxnormConso';
const rxnormSatCollectionName = args.rxnormSatCollectionName || 'drugsRxnormSat';
const drugsMasterCollectionName = args.drugsMasterCollectionName || 'drugsMaster';

async function createIndexes(dbCon) {
  const productNdc11Index = { productNdc11: 1 };
  const splSetIdIndex = { splSetId: 1 };
  const sabTtyIndex = { sab: 1, tty: 1 };
  const rxcuiAtnSabIndex = { rxcui: 1, atn: 1, sab: 1 };
  const str = JSON.stringify;

  console.log(
    `Creating indexes:\n` +
    `- ${drugsMasterCollectionName}: ${str(productNdc11Index)} and ${str(splSetIdIndex)}\n` +
    `- ${rxnormConsoCollectionName}: ${str(sabTtyIndex)}\n` +
    `- ${rxnormSatCollectionName}: ${str(rxcuiAtnSabIndex)}`
  );

  await Promise.all([
    dbCon.collection(drugsMasterCollectionName).createIndex(productNdc11Index),
    dbCon.collection(drugsMasterCollectionName).createIndex(splSetIdIndex),
    dbCon.collection(rxnormConsoCollectionName).createIndex(sabTtyIndex),
    dbCon.collection(rxnormSatCollectionName).createIndex(rxcuiAtnSabIndex),
  ]);
}

async function linkMthsplDoc(mthsplDoc, dbCon) {
  const rxnormConsoLookup = {
    table: rxnormConsoCollectionName,
    _id: mthsplDoc._id,
    label: mthsplDoc.rxaui,
  };
  const { code, rxcui, tty } = mthsplDoc;
  const productNdc11 = code.replace(/-/g, '');
  const rxCuiElem = { rxCui: rxcui, tty, _id: ObjectId() };

  const doc = await dbCon.collection(drugsMasterCollectionName).findOne({ productNdc11 });

  const now = new Date();
  if (doc) {
    const rxCuis = doc.rxCuis || [];
    const sameRxcuiTtyElem = rxCuis.find(el => el.tty === rxCuiElem.tty && el.rxCui === rxCuiElem.rxCui);
    !sameRxcuiTtyElem && rxCuis.push(rxCuiElem);
    await setUpdateAtIfRecordChanged(
      dbCon.collection(drugsMasterCollectionName),
      'updateOne',
      { _id: doc._id },
      { $set: { rxCuis }, $addToSet: { 'links.rxnormConso': rxnormConsoLookup } }
    );
  } else {
    await dbCon.collection(drugsMasterCollectionName).insertOne({
      ...conditionForActualRecord,
      productNdc11,
      rxCuis: [rxCuiElem],
      links: { rxnormConso: [rxnormConsoLookup] },
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function linkRxnormDoc(rxnormDoc, dbCon) {
  const cuiIn = rxnormDoc.code;
  const atvResults = await dbCon
    .collection(rxnormSatCollectionName)
    .find({ rxcui: cuiIn, atn: 'SPL_SET_ID', sab: 'MTHSPL' }, { projection: { atv: 1 } })
    .toArray();

  if (!atvResults.length) {
    console.log(`No matches for cuiIn=${cuiIn}`);
    return;
  }

  const atvs = new Set();
  atvResults.forEach(d => atvs.add(d.atv));

  const rxnormConsoLookup = {
    table: rxnormConsoCollectionName,
    _id: rxnormDoc._id,
    label: rxnormDoc.rxaui,
  };

  const rxnormActiveIngredientsCodes = { rxnormActiveIngredientsCode: cuiIn };
  await setUpdateAtIfRecordChanged(
    dbCon.collection(drugsMasterCollectionName),
    'updateMany',
    { splSetId: { $in: Array.from(atvs) } },
    { $addToSet: { rxnormActiveIngredientsCodes, 'links.rxnormConso': rxnormConsoLookup } }
  );
}

async function linkMthsplDocsToMaster(dbCon) {
  const mthsplCursor = dbCon.collection(rxnormConsoCollectionName).find({ sab: 'MTHSPL', tty: 'DP' });
  let docs = [];
  while (await mthsplCursor.hasNext()) {
    const mthsplDoc = await mthsplCursor.next();
    docs.push(mthsplDoc);
    if (docs.length >= 100) {
      await Promise.map(docs, d => linkMthsplDoc(d, dbCon));
      docs = [];
    }
  }
  await Promise.map(docs, d => linkMthsplDoc(d, dbCon));
}

async function linkRxnormDocsToMaster(dbCon) {
  const rxnormCursor = dbCon.collection(rxnormConsoCollectionName).find({ sab: 'RXNORM', tty: { $in: ['IN', 'MIN'] } });
  let docs = [];

  while (await rxnormCursor.hasNext()) {
    const rxnormDoc = await rxnormCursor.next();
    docs.push(rxnormDoc);
    if (docs.length >= 10) {
      await Promise.map(docs, d => linkRxnormDoc(d, dbCon));
      docs = [];
    }
  }
  await Promise.map(docs, d => linkRxnormDoc(d, dbCon));
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    await createIndexes(dbCon);

    console.log(`Linking MTHSPL docs to '${drugsMasterCollectionName}'...`);
    await linkMthsplDocsToMaster(dbCon);

    console.log(`Linking RXNORM docs to '${drugsMasterCollectionName}'...`);
    await linkRxnormDocsToMaster(dbCon);

    console.log(`\nDone linking rxnormConso docs to ${drugsMasterCollectionName}`);
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while Rxnsat data', e);
    process.exit(1);
  }
})();
