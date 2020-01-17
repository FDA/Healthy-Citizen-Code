const Promise = require('bluebird');
const args = require('optimist').argv;
const { mongoConnect, setUpdateAtIfRecordChanged } = require('../util/mongo');

const { mongoUrl } = args;
if (!mongoUrl) {
  console.log('Please specify mongoUrl');
  process.exit(1);
}

const rxnormConsoCollectionName = args.rxnormConsoCollectionName || 'drugsRxnormConso';
const rxnormRelCollectionName = args.rxnormRelCollectionName || 'drugsRxnormRel';

async function createIndexes(dbCon) {
  await Promise.all([
    dbCon.collection(rxnormRelCollectionName).createIndex({ rela: 1 }),
    dbCon.collection(rxnormConsoCollectionName).createIndex({ rxcui: 1 }),
    dbCon.collection(rxnormConsoCollectionName).createIndex({ tty: 1 }),
  ]);
  console.log(
    `Created 'rela' index for '${rxnormRelCollectionName}'; 'rxcui', 'tty' indexes for '${rxnormConsoCollectionName}'`
  );
}

async function handleRelDoc(relDoc, dbCon) {
  const rxcui = relDoc.rxcui1;
  const activeIngredientCui = relDoc.rxcui2;
  const res = await setUpdateAtIfRecordChanged(
    dbCon.collection(rxnormConsoCollectionName), 'updateOne',
    { rxcui, tty: 'BN' },
    { $addToSet: { activeIngredientCui } }
  );
  if (res.result.nModified) {
    console.log(`For doc with rxcui=${rxcui} pushed '${activeIngredientCui}' to set 'activeIngredientCui'`);
  }
}

async function addActiveIngredients(dbCon) {
  const relCursor = dbCon.collection(rxnormRelCollectionName).find({ rela: 'has_tradename' });
  while (await relCursor.hasNext()) {
    const relDoc = await relCursor.next();
    await handleRelDoc(relDoc, dbCon);
  }
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    await createIndexes(dbCon);
    await addActiveIngredients(dbCon);
    console.log(`\nDone populating field 'activeIngredientCui' for ${rxnormConsoCollectionName}`);
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while Rxnsat data', e);
    process.exit(1);
  }
})();
