const _ = require('lodash');
const args = require('optimist').argv;
const Promise = require('bluebird');
const { mongoConnect, setUpdateAtIfRecordChanged } = require('../util/mongo');

const { mongoUrl } = args;
const faersCollectionName = args.faersCollectionName || 'aesFaers';
const drugsMasterCollectionName = args.drugsMasterCollectionName || 'drugsMaster';

if (!mongoUrl) {
  console.log(`Please specify params 'mongoUrl'`);
  process.exit(1);
}

async function linkFaersToDrugsMaster(faersDoc, dbCon) {
  try {
    const aeLookup = {
      table: faersCollectionName,
      label: faersDoc.safetyReportId,
      _id: faersDoc._id,
    };
    const activeIngredientsCodes = faersDoc.activeIngredientsCodes.map(obj => obj.activeIngredientsCode).filter(c => c);
    if (!activeIngredientsCodes.length) {
      return
    }

    await setUpdateAtIfRecordChanged(
      dbCon.collection(drugsMasterCollectionName), 'updateMany',
      { 'rxnormActiveIngredientsCodes.rxnormActiveIngredientsCode': { $in: activeIngredientsCodes } },
      { $addToSet: { 'links.aesConceptant': aeLookup } }
    );
  } catch (e) {
    console.error(`Error while linking FAERS adverse event ${JSON.stringify(faersDoc)}`, e.stack);
  }
}

async function createIndexes(indexFieldNames, collection, dbCon) {
  return Promise.map(indexFieldNames, fieldName => dbCon.collection(collection).createIndex({ [fieldName]: 1 }));
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    const aeIndexFieldNames = ['activeIngredientsCodes'];
    console.log(`Creating '${faersCollectionName}' DB Indexes: ${aeIndexFieldNames.join(', ')}`);
    await createIndexes(aeIndexFieldNames, faersCollectionName, dbCon);

    const drugsMasterIndexFieldNames = ['rxnormActiveIngredientsCodes.rxnormActiveIngredientsCode'];
    console.log(`Creating '${drugsMasterCollectionName}' DB Indexes: ${drugsMasterIndexFieldNames.join(', ')}`);
    await createIndexes(drugsMasterIndexFieldNames, drugsMasterCollectionName, dbCon);
    console.log(`DB Indexes created`);

    const aeCursor = await dbCon
      .collection(faersCollectionName)
      .find(
        { activeIngredientsCodes: { $exists: true, $ne: [] } },
        { projection: { safetyReportId: 1, activeIngredientsCodes: 1 } }
      )
      .addCursorFlag('noCursorTimeout', true);

    console.log(`Linking adverse events from '${faersCollectionName}' to '${drugsMasterCollectionName}'.`);
    while (await aeCursor.hasNext()) {
      const aeDoc = await aeCursor.next();
      await linkFaersToDrugsMaster(aeDoc, dbCon);
    }

    console.log('\nDone');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred', e.stack);
    process.exit(1);
  }
})();
