const Promise = require('bluebird');
const fs = require('fs-extra');
const path = require('path');
const stream = require('stream');
const es = require('event-stream');
const readline = require('readline');
const args = require('optimist').argv;
const _ = require('lodash');
const unzipper = require('unzipper');
const streamToPromise = require('stream-to-promise');
const uuidv4 = require('uuid/v4');
const { convertRxnconsoToObject } = require('../rxnav/ndc_rxcui_helper');
const { camelCaseKeysDeep } = require('../util/object');
const { mongoConnect, insertOrReplaceDocByCondition } = require('../util/mongo');

// handling
process.on('unhandledRejection', err => console.log(`Unhandled Rejection: ${err.stack}`));

const { mongoUrl } = args;
if (!mongoUrl) {
  console.log('Please specify mongoUrl');
  process.exit(1);
}

const collectionName = args.rxnormConsoCollectionName || 'drugsRxnormConso';

if (!_.isString(args.zipDestinationPath)) {
  console.log(`Please specify 'zipDestinationPath'`);
  process.exit(1);
}
const zipDestinationPath = path.resolve(__dirname, args.zipDestinationPath);

async function handleRxnconsoFile(tempRxnsatPath, dbCon) {
  const fileStream = fs.createReadStream(tempRxnsatPath, { encoding: 'utf8' }).pipe(es.split());

  let docs = [];
  let docsCounter = 0;
  const batchSize = 1000;
  const concurrency = 20;

  return new Promise((resolve, reject) => {
    fileStream
      .on('data', async data => {
        try {
          const rxnsconsoDoc = getRxnsconsoDoc(data);
          rxnsconsoDoc && docs.push(rxnsconsoDoc);
          if (docs.length >= batchSize) {
            fileStream.pause();
            await Promise.map(docs, doc => upsertRxnconsoDoc(doc, dbCon), { concurrency });

            docsCounter += batchSize;
            readline.clearLine(process.stdout, 0); // move cursor to beginning of line
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`Docs handled: ${docsCounter}`);

            docs = [];
            fileStream.resume();
          }
        } catch (e) {
          console.log(`Error occurred while upserting Rxnconso docs`, e.stack);
        }
      })
      .on('end', () => resolve(Promise.map(docs, doc => upsertRxnconsoDoc(doc, dbCon), { concurrency })))
      .on('error', e => reject(e));
  });
}

function unzipRxnConso(zipPath) {
  const zipStream = fs.createReadStream(zipPath).pipe(unzipper.Parse());
  let tempRxnconsoPath;

  return new Promise((resolve, reject) => {
    zipStream
      .pipe(
        stream.Transform({
          objectMode: true,
          async transform(entry, e, cb) {
            const { type, path: filePath } = entry;
            if (type === 'File' && filePath.includes('rrf/RXNCONSO.RRF')) {
              tempRxnconsoPath = `/tmp/${uuidv4()}`;
              await streamToPromise(entry.pipe(fs.createWriteStream(tempRxnconsoPath)));
            } else {
              entry.autodrain();
            }
            cb();
          },
        })
      )
      .on('finish', () => resolve(tempRxnconsoPath))
      .on('error', e => reject(e));
  });
}

async function handleZip(zipPath, dbCon) {
  const tempRxnconsoPath = await unzipRxnConso(zipPath);
  return handleRxnconsoFile(tempRxnconsoPath, dbCon);
}

async function createIndexes(collection, dbCon) {
  await Promise.all([dbCon.collection(collection).createIndex({ rxaui: 1 })]);
  console.log(`DB Indexes created: 'rxaui'`);
}

function getRxnsconsoDoc(line) {
  const values = line.split('|');
  const rxconsoDoc = convertRxnconsoToObject(values);
  const result = camelCaseKeysDeep(rxconsoDoc);

  return result;
}

function upsertRxnconsoDoc(doc, dbCon) {
  const { rxaui } = doc;
  return insertOrReplaceDocByCondition(doc, dbCon.collection(collectionName), { rxaui });
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    await createIndexes(collectionName, dbCon);
    await handleZip(zipDestinationPath, dbCon);

    console.log('\nDone pumping Rxnconso data');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while pumping Rxnconso data', e);
    process.exit(1);
  }
})();
