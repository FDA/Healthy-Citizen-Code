const args = require('optimist').argv;
const _ = require('lodash');
const path = require('path');
const xlsx = require('node-xlsx');
const { MongoClient } = require('mongodb');

const COLLECTION_NAME = 'cptcodes';
const SHEET_NAME_TO_PARSE = 'ALL CPT Codes Combined';
const XLS_PATH = path.resolve(__dirname, './resources/cpt-pcm-nhsn.xlsx');

const upsertDoc = (dbCon, collectionName, doc) => {
  return dbCon.collection(collectionName).update({ cptCode: doc.cptCode }, doc, { upsert: true })
    .then((commandResult) => {
      if (commandResult.result.nModified === 1) {
        console.log(`Updated entry in '${collectionName}' with cptCode: ${doc.cptCode}`);
      } else {
        console.log(`Inserted entry in '${collectionName}' with cptCode: ${doc.cptCode}`);
      }
      return true;
    });
};

const pumpFromXls = (mongoUrl, collectionName, xlsPath) => new Promise((resolve, reject) => {
  MongoClient.connect(mongoUrl, (err, dbCon) => {
    if (err) {
      reject(`Cannot get connection to ${mongoUrl}`);
      return;
    }
    resolve(dbCon);
  });
})
  .then((dbCon) => {
    const parsedXls = xlsx.parse(xlsPath);
    const sheet = parsedXls.filter(sheet => sheet.name === SHEET_NAME_TO_PARSE)[0];
    const promises = [];
    if (_.isEmpty(sheet)) {
      console.log(`Cannot find sheet name ${SHEET_NAME_TO_PARSE}`);
      return;
    }
    const { data } = sheet;
    for (let i = 1; i < data.length; i++) {
      const doc = {
        procedureCodeCategory: data[i][0],
        cptCode: data[i][1],
        codeDescription: data[i][2],
      };
      promises.push(upsertDoc(dbCon, collectionName, doc));
    }

    return Promise.all(promises);
  })
  .catch((err) => {
    console.log(err);
  });

const { mongoUrl } = args;
if (!mongoUrl) {
  console.log('Please specify mongoUrl');
  process.exit(1);
}

const collectionName = args.collectionName || COLLECTION_NAME;
pumpFromXls(mongoUrl, collectionName, XLS_PATH)
  .then(() => {
    console.log('Done');
    process.exit(0);
  });
