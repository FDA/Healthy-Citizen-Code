const _ = require('lodash');
const args = require('optimist').argv;
const Promise = require('bluebird');
const { mongoConnect } = require('../../../util/mongo');

const { mongoUrl } = args;
const aesCollectionName = args.aesCollectionName || 'aesOpenfdaDrugs';
const drugsMasterCollectionName = args.drugsMasterCollectionName || 'drugsMaster';

if (!mongoUrl) {
  console.log(`Please specify params 'mongoUrl'`);
  process.exit(1);
}

async function linkAdverseEventToDrugsMaster(drugsMasterDoc, dbCon) {
  try {
    const drugAEs = await dbCon
      .collection(aesCollectionName)
      .find(
        {
          normalizedPackageNdcs11: drugsMasterDoc.packageNdc11,
          _id: { $nin: _.get(drugsMasterDoc, 'links.aesOpenfda', []).map(lookup => lookup._id) },
        },
        { projection: { safetyReportId: 1 } }
      )
      .toArray();
    if (!drugAEs.length) {
      // console.log(`No AEs found for packageNdc11 ${drugsMasterDoc.packageNdc11}`);
      return;
    }
    const aeLookups = drugAEs.map(ae => ({
      table: aesCollectionName,
      label: ae.safetyReportId,
      _id: ae._id,
    }));
    await dbCon
      .collection(drugsMasterCollectionName)
      .updateOne(
        { _id: drugsMasterDoc._id },
        { $set: { updatedAt: new Date() }, $push: { 'links.aesOpenfda': { $each: aeLookups } } }
      );
    // console.log(`Pushed to packageNdc11 ${drugsMasterDoc.packageNdc11} aeLookups ${JSON.stringify(aeLookups)}`)
  } catch (e) {
    console.error(`Error while linking adverse event ${JSON.stringify(drugsMasterDoc)}`, e.stack);
  }
}

async function createIndexes(indexFieldNames, collection, dbCon) {
  return Promise.map(indexFieldNames, fieldName => dbCon.collection(collection).createIndex({ [fieldName]: 1 }));
}

(async () => {
  try {
    const start = process.hrtime();

    const dbCon = await mongoConnect(mongoUrl);
    const aesIndexFieldNames = ['normalizedPackageNdcs11'];
    console.log(`Creating '${aesCollectionName}' DB Indexes: ${aesIndexFieldNames.join(', ')}`);
    await createIndexes(aesIndexFieldNames, aesCollectionName, dbCon);

    const drugsMasterIndexFieldNames = ['packageNdc11'];
    console.log(`Creating '${drugsMasterCollectionName}' DB Indexes: ${drugsMasterIndexFieldNames.join(', ')}`);
    await createIndexes(drugsMasterIndexFieldNames, drugsMasterCollectionName, dbCon);
    console.log(`DB Indexes created`);

    const drugsMasterCursor = await dbCon
      .collection(drugsMasterCollectionName)
      .find({ packageNdc11: { $ne: null } }, { projection: { packageNdc11: 1, 'links.aesOpenfda': 1 } })
      .addCursorFlag('noCursorTimeout', true);

    console.log(`Linking adverse events from '${aesCollectionName}' to '${drugsMasterCollectionName}'.`);

    let docs = [];
    let docsCounter = 0;
    const batchSize = 200;
    console.info(`Batch size is ${batchSize}`);

    let batchStart = process.hrtime();
    let batchEnd;
    while (await drugsMasterCursor.hasNext()) {
      const drugsMasterDoc = await drugsMasterCursor.next();
      docs.push(drugsMasterDoc);
      docsCounter++;
      if (docs.length >= batchSize) {
        await Promise.map(docs, doc => linkAdverseEventToDrugsMaster(doc, dbCon), { concurrency: 30 });
        docs = [];

        batchEnd = process.hrtime(batchStart);
        batchStart = process.hrtime();
        console.info(
          `Execution time for batch (docsCounter=${docsCounter}): %ds %dms`,
          batchEnd[0],
          batchEnd[1] / 10e6
        );
      }
    }
    await Promise.map(docs, doc => linkAdverseEventToDrugsMaster(doc, dbCon), { concurrency: 30 });

    const end = process.hrtime(start);
    console.info('Execution time (total): %ds %dms', end[0], end[1] / 10e6);

    console.log('\nDone');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred', e.stack);
    process.exit(1);
  }
})();
