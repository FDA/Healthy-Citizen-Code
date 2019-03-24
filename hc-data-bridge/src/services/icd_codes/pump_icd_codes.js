/**
 * Current code is deprecated, we switched to pumping from tree representation (see ./pump_icd_tree.js)
 */

const args = require('optimist').argv;

const path = require('path');
const { MongoClient } = require('mongodb');

const ICD_CM_TEXT_PATH = path.resolve(__dirname, './resources/icd10cm_codes_2018.txt');
const ICD_CM_COLLECTION_NAME = 'icd10cmcodes';

const ICD_PCS_TEXT_PATH = path.resolve(__dirname, './resources/icd10pcs_codes_2018.txt');
// const ICD_PCS_COLLECTION_NAME = 'icd10pcscodes';

const readline = require('readline');
const fs = require('fs');
const Promise = require('bluebird');

const upsertDoc = (dbCon, collectionName, doc) => {
  return dbCon.collection(collectionName).update({ icd10Code: doc.icd10Code }, doc, { upsert: true })
    .then((commandResult) => {
      if (commandResult.result.nModified === 1) {
        console.log(`Updated entry in '${collectionName}' with icd10Code: ${doc.icd10Code}`);
      } else {
        console.log(`Inserted entry in '${collectionName}' with icd10Code: ${doc.icd10Code}`);
      }
      return true;
    })
    .catch((err) => {
      console.log(err);
      return false;
    });
};

const pumpCodes = (mongoUrl, collectionName, txtPath) => {
  let dbCon = null;
  return new Promise((resolve, reject) => {
    MongoClient.connect(mongoUrl, (err, dbConnection) => {
      if (err) {
        reject(`Cannot get connection to ${mongoUrl}`);
        return;
      }
      dbCon = dbConnection;
      resolve();
    });
  })
    .then(() => dbCon.collection(collectionName).createIndex({ icd10Code: 1 }))
    .then(() => {
      const promises = [];

      const rl = readline.createInterface({
        terminal: false,
        input: fs.createReadStream(txtPath),
      });

      rl.on('line', (line) => {
        const [entry, icd10Code, description] = line.match(/([^ ]+)[ ]+(.+)/) || [];
        if (!icd10Code || !description) {
          console.error(`Invalid line: ${line}`);
        } else {
          promises.push(upsertDoc(dbCon, collectionName, { icd10Code, description }));
        }
      });

      return new Promise((resolve) => {
        rl.on('close', () => {
          resolve(Promise.all(promises));
        });
      });
    })
    .catch((err) => {
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

pumpCodes(mongoUrl, icdCmCollectionName, ICD_CM_TEXT_PATH)
  .then(() => {
    console.log('Done with CM codes');
    if (!icdPcsCollectionName) {
      process.exit(0);
    }
    console.log('===================\n');
    return pumpCodes(mongoUrl, icdPcsCollectionName, ICD_PCS_TEXT_PATH);
  })
  .then(() => {
    console.log('Done with PCS codes');
    process.exit(0);
  });
