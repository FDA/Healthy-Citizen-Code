const args = require('optimist').argv;
const _ = require('lodash');
const path = require('path');
const xlsx = require('node-xlsx');
const { mongoConnect, insertOrReplaceDocByCondition } = require('../util/mongo');

const COLLECTION_NAME = 'cptcodes';
const SHEET_NAME_TO_PARSE = 'ALL CPT Codes Combined';
const XLS_PATH = path.resolve(__dirname, './resources/cpt-pcm-nhsn.xlsx');

const upsertDoc = (dbCon, collectionName, doc) =>
  insertOrReplaceDocByCondition(doc, dbCon.collection(collectionName), { cptCode: doc.cptCode });

const pumpFromXls = (mongoUrl, collectionName, xlsPath) =>
  mongoConnect(mongoUrl)
    .then(dbCon => {
      const parsedXls = xlsx.parse(xlsPath, { raw: false });
      const cptCodesSheet = parsedXls.filter(sheet => sheet.name === SHEET_NAME_TO_PARSE)[0];
      const promises = [];
      if (_.isEmpty(cptCodesSheet)) {
        console.log(`Cannot find sheet name ${SHEET_NAME_TO_PARSE}`);
        return;
      }
      const { data } = cptCodesSheet;
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const doc = {
          procedureCodeCategory: row[0],
          cptCode: row[1],
          codeDescription: row[2],
        };
        promises.push(upsertDoc(dbCon, collectionName, doc));
      }

      return Promise.all(promises);
    })
    .catch(err => {
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
  })
  .catch(e => {
    console.log('Error occurred during pumping CPT Codes', e.stack);
    process.exit(1);
  });
