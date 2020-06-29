const Promise = require('bluebird');
const _ = require('lodash');
const args = require('optimist').argv;
const { mongoConnect, setUpdateAtIfRecordChanged } = require('../util/mongo');

const { mongoUrl } = args;
if (!mongoUrl) {
  console.log('Please specify mongoUrl');
  process.exit(1);
}

const faersCollectionName = args.faersCollectionName || 'aesFaers';
const drugsMasterCollectionName = args.drugsMasterCollectionName || 'drugsMaster';
const rxnormConsoCollectionName = args.rxnormConsoCollectionName || 'drugsRxnormConso';

async function createIndexes(dbCon) {
  await Promise.all([
    dbCon.collection(drugsMasterCollectionName).createIndex({ name: 1 }),
    dbCon.collection(faersCollectionName).createIndex({ 'drugs.drugCharacterization': 1 }),
    dbCon.collection(rxnormConsoCollectionName).createIndex(
      { strSearchable: 1 },
      {
        collation: {
          locale: 'en',
          strength: 1,
        },
      }
    ),
  ]);
  console.log(
    `Created 'name' index for '${drugsMasterCollectionName}'; 'drugs.drugCharacterization' index for '${faersCollectionName}', 'strSearchable' index for ${rxnormConsoCollectionName}`
  );
}

async function handleFaersDoc(faersDoc, dbCon) {
  const activeSubstances = faersDoc.drugs
    .filter(drug => drug.drugCharacterization === '1' && !_.isEmpty(drug.activeSubstances))
    .map(drug => _.map(drug.activeSubstances, obj => obj.activeSubstance))
    .filter(as => as);

  const results = await dbCon
    .collection(rxnormConsoCollectionName)
    .find({ strSearchable: { $in: activeSubstances }, tty: 'IN' }, { projection: { rxcui: 1 } })
    .collation({ locale: 'en', strength: 1 })
    .toArray();
  const ingredientsCodes = results.map(r => r.rxcui);
  if (ingredientsCodes.length) {
    const activeIngredientsCodes = ingredientsCodes.map(activeIngredientsCode => ({ activeIngredientsCode }));
    await setUpdateAtIfRecordChanged(
      dbCon.collection(faersCollectionName),
      'updateOne',
      { _id: faersDoc._id },
      { $set: { activeIngredientsCodes } }
    );
    return console.log(
      `Set activeIngredientsCodes=${activeIngredientsCodes.join(
        ','
      )} for ${faersCollectionName} with _id: ${faersDoc._id.toString()}`
    );
  }

  const medicinalProducts = faersDoc.drugs
    .filter(drug => drug.drugCharacterization === '1' && drug.medicinalProduct)
    .map(drug => drug.medicinalProduct);

  const rxnormCuiRes = await dbCon
    .collection(drugsMasterCollectionName)
    .find({ name: { $in: medicinalProducts } }, { projection: { rxnormCui: 1 } })
    .toArray();

  const medicinalProductsRxcuiSet = new Set();
  rxnormCuiRes.forEach(d => medicinalProductsRxcuiSet.add(d.rxnormCui));
  const medicinalProductsRxcuis = Array.from(medicinalProductsRxcuiSet);

  if (medicinalProductsRxcuis.length) {
    await setUpdateAtIfRecordChanged(
      dbCon.collection(faersCollectionName),
      'updateOne',
      { _id: faersDoc._id },
      { $set: { activeIngredientsCodes: medicinalProductsRxcuis } }
    );
    return console.log(
      `Set 'activeIngredientsCodes'=${medicinalProductsRxcuis.join()} for ${faersCollectionName} with _id: ${faersDoc._id.toString()}`
    );
  }
}

async function handleFaersDocs(dbCon) {
  const faersCursor = dbCon
    .collection(faersCollectionName)
    .find({ drugs: { $elemMatch: { drugCharacterization: '1', activeSubstances: { $ne: [] } } } });
  while (await faersCursor.hasNext()) {
    const faersDoc = await faersCursor.next();
    await handleFaersDoc(faersDoc, dbCon);
  }
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    await createIndexes(dbCon);
    await handleFaersDocs(dbCon);
    console.log(`\nDone adding active ingredients to FAERS docs.`);
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while Rxnsat data', e);
    process.exit(1);
  }
})();
