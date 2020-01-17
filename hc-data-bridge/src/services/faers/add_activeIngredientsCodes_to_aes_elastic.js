const Promise = require('bluebird');
const _ = require('lodash');
const readline = require('readline');
const { stringify } = JSON;
const { Client } = require('@elastic/elasticsearch');
const args = require('optimist').argv;
const { mongoConnect, setUpdateAtIfRecordChanged } = require('../util/mongo');
const { scrollSearch } = require('../util/elastic');

const { mongoUrl } = args;
if (!mongoUrl) {
  log('Please specify mongoUrl');
  process.exit(1);
}

const aesCollectionName = args.aesCollectionName || 'aesFaers';
const drugsMasterCollectionName = args.drugsMasterCollectionName || 'drugsMaster';
const rxnormConsoCollectionName = args.rxnormConsoCollectionName || 'drugsRxnormConso';
const isLogEnabled = ['true', 1].includes(args.log);
const ES_NODES = args.esNodes || 'http://localhost:9200';

function log (...params) {
  if (isLogEnabled) {
    return console.log(...params);
  }
}

async function createMongoIndexes(dbCon) {
  await Promise.all([
    dbCon.collection(drugsMasterCollectionName).createIndex({ name: 1 }),
    dbCon.collection(aesCollectionName).createIndex({ 'drugs.drugCharacterization': 1, 'drugs.activeSubstances': 1 }),
  ]);
  log(
    `Created 'name' index for '${drugsMasterCollectionName}'; 'drugs.drugCharacterization' index for '${aesCollectionName}'`
  );
}

async function getIngredientsCodesFromConso(activeSubstances, elastic, esIndexName) {
  const queryForIngredients = activeSubstances.map(str => `"${str}"`).join(' OR ');

  const params = {
    index: esIndexName,
    scroll: '30s',
    size: 10000,
    _source: ['str', 'rxcui'],
    body: {
      query: {
        bool: {
          must: [
            {
              term: {
                'tty.keyword': 'IN',
              },
            },
            {
              query_string: {
                query: queryForIngredients,
                default_field: 'str', // search for substances in 'str' field
              },
            },
          ],
        },
      },
    },
  };

  const hits = [];
  for await (const hit of scrollSearch(elastic, params)) {
    hits.push(hit._source);
  }

  if (hits.length) {
    const found = hits.map(h => `${h.rxcui} - ${h.str}`).join('\n');
    log(`-- For ${esIndexName} query '${queryForIngredients}' found:\n${found}`);
  }

  return hits.map(h => h.rxcui);
}

async function getIngredientsCodesFromDrugsMaster(medicinalProducts, elastic, esIndexName) {
  const queryForNames = medicinalProducts.map(str => `"${str}"`).join(' OR ');

  const params = {
    index: esIndexName,
    scroll: '30s',
    size: 10000,
    _source: ['name', 'rxnormActiveIngredientsCodes'],
    body: {
      query: {
        bool: {
          must: [
            {
              exists: {
                field: 'rxnormActiveIngredientsCodes',
              },
            },
            {
              query_string: {
                query: queryForNames,
                default_field: 'name', // search for medicinal products in 'name' field
              },
            },
          ],
        },
      },
    },
  };

  const hits = [];
  for await (const hit of scrollSearch(elastic, params)) {
    hits.push(hit._source);
  }

  if (hits.length) {
    const ingredientsFromAllDrugs = new Set();
    const found = hits
      .map(h => {
        const codes = _.map(h.rxnormActiveIngredientsCodes, obj => obj.rxnormActiveIngredientsCode).filter(c => c);
        codes.forEach(c => ingredientsFromAllDrugs.add(c));
        return `${codes.length ? codes : 'no rxnormActiveIngredientsCodes'} - ${h.name}`;
      })
      .join('\n');
    log(`-- For ${esIndexName} query '${queryForNames}' found:\n${found}`);

    return [...ingredientsFromAllDrugs];
  }

  return [];
}

async function setActiveIngredientsForDoc(aesDoc, dbCon, elastic, consoEsIndexName, drugsMasterEsIndexName) {
  const activeSubstancesSet = new Set();
  aesDoc.drugs
    .filter(drug => drug.drugCharacterization === '1' && !_.isEmpty(drug.activeSubstances))
    .forEach(drug => _.each(drug.activeSubstances, as => activeSubstancesSet.add(as.activeSubstance)));

  const activeSubstances = [...activeSubstancesSet];
  const ingredientsCodesFromConso = await getIngredientsCodesFromConso(activeSubstances, elastic, consoEsIndexName);
  if (ingredientsCodesFromConso.length) {
    const activeIngredientsCodes = ingredientsCodesFromConso.map(activeIngredientsCode => ({ activeIngredientsCode }));
    await setUpdateAtIfRecordChanged(
      dbCon.collection(aesCollectionName),
      'updateOne',
      { _id: aesDoc._id },
      { $set: { activeIngredientsCodes } }
    );
    return log(`Updated ${aesCollectionName} with _id '${aesDoc._id.toString()}'`);
  }

  log(
    `No active ingredients found for substances=${stringify(
      activeSubstances
    )}. Doc _id='${aesDoc._id.toString()}. Continue searching for medicinal products.`
  );

  const medicinalProductsSet = new Set(
    aesDoc.drugs
      .filter(drug => drug.drugCharacterization === '1' && drug.medicinalProduct)
      .map(drug => drug.medicinalProduct)
  );

  const medicinalProducts = [...medicinalProductsSet];
  const ingredientsCodesFromDrugsMaster = await getIngredientsCodesFromDrugsMaster(
    medicinalProducts,
    elastic,
    drugsMasterEsIndexName
  );

  if (ingredientsCodesFromDrugsMaster.length) {
    const activeIngredientsCodes = ingredientsCodesFromDrugsMaster.map(activeIngredientsCode => ({
      activeIngredientsCode,
    }));
    await setUpdateAtIfRecordChanged(
      dbCon.collection(aesCollectionName),
      'updateOne',
      { _id: aesDoc._id },
      { $set: { activeIngredientsCodes } }
    );
    return log(`Updated ${aesCollectionName} with _id '${aesDoc._id.toString()}'`);
  }
  log(
    `No active ingredients found for medicinalProducts=${stringify(
      medicinalProducts
    )}. Doc _id='${aesDoc._id.toString()}'`
  );
}

async function setActiveIngredientsWithElastic(dbCon, elastic) {
  const aesCursor = dbCon
    .collection(aesCollectionName)
    .find({ drugs: { $elemMatch: { drugCharacterization: '1', activeSubstances: { $ne: [] } } } });

  const { databaseName } = dbCon.s;
  const consoEsIndexName = `${databaseName}.${rxnormConsoCollectionName}`.toLowerCase();
  const drugsMasterEsIndexName = `${databaseName}.${drugsMasterCollectionName}`.toLowerCase();


  let docs = [];
  let counter = 0;
  const batchSize = 100;

  while (await aesCursor.hasNext()) {
    const aesDoc = await aesCursor.next();
    docs.push(aesDoc);
    if (docs.length >= batchSize) {
      await Promise.map(docs, d =>
        setActiveIngredientsForDoc(d, dbCon, elastic, consoEsIndexName, drugsMasterEsIndexName)
      );
      counter += batchSize;

      readline.clearLine(process.stdout, 0); // move cursor to beginning of line
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(`Docs handled ${counter}`);

      docs = [];
    }
  }
  await Promise.map(docs, d => setActiveIngredientsForDoc(d, dbCon, elastic, consoEsIndexName, drugsMasterEsIndexName));
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);

    await createMongoIndexes(dbCon);

    const elastic = new Client({ nodes: ES_NODES });
    try {
      await elastic.cat.health();
    } catch (e) {
      console.error(`Error occurred while connecting to ElasticSearch with nodes: ${ES_NODES}`, e.stack);
      process.exit(1);
    }

    await setActiveIngredientsWithElastic(dbCon, elastic);
    log(`\nDone adding active ingredients to AES docs.`);
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while adding active ingredients to AES docs', e);
    process.exit(1);
  }
})();
