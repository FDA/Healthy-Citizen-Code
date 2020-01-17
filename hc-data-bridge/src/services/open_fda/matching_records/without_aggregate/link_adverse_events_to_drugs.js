const _ = require('lodash');
const args = require('optimist').argv;
const Promise = require('bluebird');
const { mongoConnect, setUpdateAtIfRecordChanged } = require('../../../util/mongo');

const { mongoUrl, aesCollectionName, drugCollectionName } = args;

if (!mongoUrl || !aesCollectionName || !drugCollectionName) {
  console.log('Please specify params: mongoUrl, aesCollectionName, drugCollectionName');
  process.exit(1);
}

const VALID_DRUG_CHARACTERIZATIONS = ['1', '3'];

async function linkAeToDrug(aeDoc, dbCon) {
  const aggregated = _(aeDoc.patient.drug)
    .filter(d => VALID_DRUG_CHARACTERIZATIONS.includes(d.drugcharacterization) && !_.isEmpty(d.openfda))
    .reduce(
      (res, d) => {
        const { splId, splSetId, packageNdc, productNdc } = d.openfda;
        _.each(splId, id => res.splId.add(id));
        _.each(splSetId, id => res.splSetId.add(id));
        _.each(packageNdc, ndc => res.packageNdc.add(ndc));
        _.each(productNdc, ndc => res.productNdc.add(ndc));
        return res;
      },
      {
        splId: new Set(),
        splSetId: new Set(),
        packageNdc: new Set(),
        productNdc: new Set(),
      }
    );

  const aggregatedSplId = Array.from(aggregated.splId);
  const aggregatedSplSetId = Array.from(aggregated.splSetId);
  const aggregatedPackageNdc = Array.from(aggregated.packageNdc);
  const aggregatedProductNdc = Array.from(aggregated.productNdc);

  const orCondition = [];
  aggregatedSplId.length && orCondition.push({ 'openfda.splId': { $in: aggregatedSplId } });
  aggregatedSplSetId.length && orCondition.push({ 'openfda.splSetId': { $in: aggregatedSplSetId } });
  aggregatedPackageNdc.length && orCondition.push({ 'openfda.packageNdc': { $in: aggregatedPackageNdc } });
  aggregatedProductNdc.length && orCondition.push({ 'openfda.productNdc': { $in: aggregatedProductNdc } });

  if (!orCondition.length) {
    return console.log(`Empty fields: openfda.splId, openfda.splSetId, openfda.packageNdc, openfda.productNdc`);
  }

  const matchedDrugDocs = await dbCon
    .collection(drugCollectionName)
    .find({ $or: orCondition }, { projection: { _id: 1 } })
    .toArray();

  const aeLookup = {
    table: aesCollectionName,
    label: aeDoc.safetyreportid,
    _id: aeDoc._id,
  };

  if (matchedDrugDocs.length) {
    await Promise.map(matchedDrugDocs, drug =>
      setUpdateAtIfRecordChanged(dbCon
        .collection(drugCollectionName)
        , 'updateOne', { _id: drug._id }, { $addToSet: { adverseEvents: aeLookup } })
    );

    const drugIds = matchedDrugDocs.map(d => d._id.toString()).join(', ');
    console.log(`Linked aeLookup: ${JSON.stringify(aeLookup)} to drugs (mongo ids: ${drugIds})`);
  }
}

async function createIndexes(indexFieldNames, collection, dbCon) {
  return Promise.map(indexFieldNames, fieldName => dbCon.collection(collection).createIndex({ [fieldName]: 1 }));
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    const aeIndexFieldNames = ['patient.drug.drugcharacterization'];
    console.log(`Creating '${aesCollectionName}' DB Indexes: ${aeIndexFieldNames.join(', ')}`);
    await createIndexes(aeIndexFieldNames, aesCollectionName, dbCon);

    const drugIndexFieldNames = ['openfda.splId', 'openfda.splSetId', 'openfda.packageNdc', 'openfda.productNdc'];
    console.log(`Creating '${drugCollectionName}' DB Indexes: ${drugIndexFieldNames.join(', ')}`);
    await createIndexes(drugIndexFieldNames, drugCollectionName, dbCon);
    console.log(`DB Indexes created`);

    const aeCursor = await dbCon
      .collection(aesCollectionName)
      .find(
        {
          'patient.drug': {
            $elemMatch: {
              drugcharacterization: { $in: ['1', '3'] },
              openfda: { $exists: true, $ne: {} },
            },
          },
        },
        { projection: { 'patient.drug': 1, safetyreportid: 1 } }
      )
      .addCursorFlag('noCursorTimeout', true);

    console.log('Searching for Adverse Events matching Drugs.');
    let adverseEvents = [];
    while (await aeCursor.hasNext()) {
      const aeDoc = await aeCursor.next();
      adverseEvents.push(aeDoc);
      if (adverseEvents.length >= 500) {
        await Promise.map(adverseEvents, d => linkAeToDrug(d, dbCon));
        adverseEvents = [];
      }
    }
    await Promise.map(adverseEvents, d => linkAeToDrug(d, dbCon));

    console.log('\nDone linking Adverse Events to Drugs');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while linking Adverse Events to Drugs', e);
    process.exit(1);
  }
})();
