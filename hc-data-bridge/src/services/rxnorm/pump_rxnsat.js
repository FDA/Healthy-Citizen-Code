const Promise = require('bluebird');
const fs = require('fs-extra');
const path = require('path');
const stream = require('stream');
const es = require('event-stream');

const args = require('optimist').argv;
const _ = require('lodash');
const unzipper = require('unzipper');
const streamToPromise = require('stream-to-promise');
const uuidv4 = require('uuid/v4');
const { convertRxnsatToObject} = require('../rxnav/ndc_rxcui_helper');
const { getNormalizedNDC, getProductCodeByNdc11 } = require('../util/ndc');
const { camelCaseKeysDeep } = require('../util/object');
const { mongoConnect, insertOrReplaceDocByCondition } = require('../util/mongo');

const { mongoUrl } = args;
if (!mongoUrl) {
  console.log('Please specify mongoUrl');
  process.exit(1);
}

const collectionName = args.rxnormSatCollectionName || 'drugsRxnormSat';

if (!_.isString(args.zipDestinationPath)) {
  console.log(`Please specify 'zipDestinationPath'`);
  process.exit(1);
}
const zipDestinationPath = path.resolve(__dirname, args.zipDestinationPath);

async function handleRxnsatFile(tempRxnsatPath, dbCon) {
  const fileStream = fs.createReadStream(tempRxnsatPath, { encoding: 'utf8' }).pipe(es.split());

  let promises = [];
  return new Promise((resolve, reject) => {
    fileStream
      .on('data', async data => {
        promises.push(upsertRxnsatDoc(data, dbCon));
        if (promises.length >= 750) {
          fileStream.pause();
          await Promise.all(promises);
          promises = [];
          fileStream.resume();
        }
      })
      .on('end', () => resolve())
      .on('error', e => reject(e));
  });
}

async function handleZip(zipPath, dbCon) {
  const zipStream = fs.createReadStream(zipPath).pipe(unzipper.Parse());
  let tempRxnsatPath;

  return new Promise(resolve => {
    zipStream
      .pipe(
        stream.Transform({
          objectMode: true,
          async transform(entry, e, cb) {
            const { type, path: filePath } = entry;
            if (type === 'File' && filePath.includes('rrf/RXNSAT.RRF')) {
              tempRxnsatPath = `/tmp/${uuidv4()}`;
              await streamToPromise(entry.pipe(fs.createWriteStream(tempRxnsatPath)));
            } else {
              entry.autodrain();
            }
            cb();
          },
        })
      )
      .on('finish', () => resolve(handleRxnsatFile(tempRxnsatPath, dbCon)))
      .on('error', e => console.log(`Error while extracting zip files from zip ${zipPath}. ${e.stack}`));
  });
}

function createIndexes(collection, indexFieldNames, dbCon) {
  return Promise.map(indexFieldNames, fieldName => dbCon.collection(collection).createIndex({ [fieldName]: 1 }));
}

function getRxnsatDoc(line) {
  const values = line.split('|');
  const rxnsatDoc = convertRxnsatToObject(values);
  const ndc11 = getNormalizedNDC(rxnsatDoc);
  if (ndc11) {
    rxnsatDoc.ndc11 = ndc11;
    rxnsatDoc.productCode = getProductCodeByNdc11(ndc11);
  }

  return camelCaseKeysDeep(rxnsatDoc);
}

async function upsertRxnsatDoc(data, dbCon) {
  if (!data) {
    return;
  }
  const doc = getRxnsatDoc(data);
  const id = `${doc.rxaui}|${doc.atn}|${doc.atv}`;
  doc.id = id;

  return insertOrReplaceDocByCondition(doc, dbCon.collection(collectionName), { id })
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    const rxnormSatIndexes = ['id'];
    await createIndexes(collectionName, rxnormSatIndexes, dbCon);
    console.log(`DB Indexes created: ${rxnormSatIndexes.join(', ')}`);

    await handleZip(zipDestinationPath, dbCon);

    console.log('\nDone pumping Rxnsat data');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while Rxnsat data', e);
    process.exit(1);
  }
})();
