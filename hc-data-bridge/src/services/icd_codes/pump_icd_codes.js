/**
 * Current code is deprecated, we switched to pumping from tree representation (see ./pump_icd_tree.js)
 */
const readline = require('readline');
const fs = require('fs');
const Promise = require('bluebird');
const args = require('optimist').argv;
const path = require('path');

const { mongoConnect, insertOrReplaceDocByCondition } = require('../util/mongo');

const ICD_CM_TEXT_PATH = path.resolve(__dirname, './resources/icd10cm_codes_2018.txt');
const ICD_CM_COLLECTION_NAME = 'icd10cmcodes';

const ICD_PCS_TEXT_PATH = path.resolve(__dirname, './resources/icd10pcs_codes_2018.txt');
// const ICD_PCS_COLLECTION_NAME = 'icd10pcscodes';

const upsertDoc = (dbCon, collectionName, doc) =>
  insertOrReplaceDocByCondition(doc, dbCon.collection(collectionName), { icd10Code: doc.icd10Code });

const pumpCodes = (mongoUrl, collectionName, txtPath) => {
  let dbCon = null;
  return mongoConnect(mongoUrl)
    .then(dbConnection => {
      dbCon = dbConnection;
    })
    .catch(e => {
      throw new Error(`Cannot get connection to ${mongoUrl}. ${e.stack}`);
    })
    .then(() => dbCon.collection(collectionName).createIndex({ icd10Code: 1 }))
    .then(() => {
      const promises = [];

      const rl = readline.createInterface({
        terminal: false,
        input: fs.createReadStream(txtPath),
      });

      rl.on('line', line => {
        const [entry, icd10Code, description] = line.match(/([^ ]+)[ ]+(.+)/) || [];
        if (!icd10Code || !description) {
          console.error(`Invalid line: ${line}`);
        } else {
          promises.push(upsertDoc(dbCon, collectionName, { icd10Code, description }));
        }
      });

      return new Promise(resolve => {
        rl.on('close', () => {
          resolve(Promise.all(promises));
        });
      });
    })
    .catch(err => {
      console.log(err);
    });
};

const { mongoUrl } = args;
if (!mongoUrl) {
  console.log('Please specify mongoUrl');
  process.exit(1);
}

const icdCmCollectionName = args.icdCmCollectionName || ICD_CM_COLLECTION_NAME;
const { icdPcsCollectionName } = args;

console.log(`Pumping CM codes...`);
pumpCodes(mongoUrl, icdCmCollectionName, ICD_CM_TEXT_PATH)
  .then(() => {
    console.log('Done with CM codes');
    if (!icdPcsCollectionName) {
      process.exit(0);
    }
    console.log('===================\n');
    console.log(`Pumping PCS codes...`)
    return pumpCodes(mongoUrl, icdPcsCollectionName, ICD_PCS_TEXT_PATH);
  })
  .then(() => {
    console.log('Done with PCS codes');
    process.exit(0);
  });
