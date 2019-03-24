const _ = require('lodash');
const args = require('optimist').argv;
const Promise = require('bluebird');
const mongoConnect = Promise.promisify(require('mongodb').MongoClient.connect);

const { mongoUrl, aeCollectionName, drugCollectionName } = args;

if (!mongoUrl || !aeCollectionName || !drugCollectionName) {
  console.log('Please specify params: mongoUrl, aeCollectionName, drugCollectionName');
  process.exit(1);
}

const VALID_DRUG_CHARACTERIZATIONS = ['1', '3'];

async function linkAeToDrug(aeDoc, dbCon) {
  const aggregated = _(aeDoc.patient.drug)
    .filter(
      d => VALID_DRUG_CHARACTERIZATIONS.includes(d.drugcharacterization) && !_.isEmpty(d.openfda)
    )
    .reduce(
      (res, d) => {
        const { spl_id, spl_set_id, package_ndc, product_ndc } = d.openfda;
        _.each(spl_id, splId => res.spl_id.add(splId));
        _.each(spl_set_id, splSetId => res.spl_set_id.add(splSetId));
        _.each(package_ndc, packageNdc => res.package_ndc.add(packageNdc));
        _.each(product_ndc, productNdc => res.product_ndc.add(productNdc));
        return res;
      },
      {
        spl_id: new Set(),
        spl_set_id: new Set(),
        package_ndc: new Set(),
        product_ndc: new Set(),
      }
    );

  const aggregatedSplId = Array.from(aggregated.spl_id);
  const aggregatedSplSetId = Array.from(aggregated.spl_set_id);
  const aggregatedPackageNdc = Array.from(aggregated.package_ndc);
  const aggregatedProductNdc = Array.from(aggregated.product_ndc);

  const orCondition = [];
  aggregatedSplId.length && orCondition.push({ 'openfda.spl_id': { $in: aggregatedSplId } });
  aggregatedSplSetId.length &&
    orCondition.push({ 'openfda.spl_set_id': { $in: aggregatedSplSetId } });
  aggregatedPackageNdc.length &&
    orCondition.push({ 'openfda.package_ndc': { $in: aggregatedPackageNdc } });
  aggregatedProductNdc.length &&
    orCondition.push({ 'openfda.product_ndc': { $in: aggregatedProductNdc } });

  if (!orCondition.length) {
    return console.log(
      `Empty fields: openfda.spl_id, openfda.spl_set_id, openfda.package_ndc, openfda.product_ndc`
    );
  }

  const matchedDrugRecords = await dbCon
    .collection(drugCollectionName)
    .find({ $or: orCondition }, { _id: 1 })
    .toArray();

  const aeLookup = {
    table: aeCollectionName,
    label: aeDoc.safetyreportid,
    _id: aeDoc._id,
  };

  if (matchedDrugRecords.length) {
    await Promise.map(matchedDrugRecords, drug =>
      dbCon
        .collection(drugCollectionName)
        .findOneAndUpdate({ _id: drug._id }, { $addToSet: { adverseEvents: aeLookup } })
    );

    const drugIds = matchedDrugRecords.map(d => d._id.toString()).join(', ');
    console.log(`Linked aeLookup: ${JSON.stringify(aeLookup)} to drugs (mongo ids: ${drugIds})`);
  }
}

async function createIndexes(indexFieldNames, collection, dbCon) {
  return Promise.map(indexFieldNames, fieldName =>
    dbCon.collection(collection).createIndex({ [fieldName]: 1 })
  );
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl, require('../../../util/mongo_connection_settings'));
    const aeIndexFieldNames = ['patient.drug.drugcharacterization'];
    console.log(`Creating '${aeCollectionName}' DB Indexes: ${aeIndexFieldNames.join(', ')}`);
    await createIndexes(aeIndexFieldNames, aeCollectionName, dbCon);

    const drugIndexFieldNames = [
      'openfda.spl_id',
      'openfda.spl_set_id',
      'openfda.package_ndc',
      'openfda.product_ndc',
    ];
    console.log(`Creating '${drugCollectionName}' DB Indexes: ${drugIndexFieldNames.join(', ')}`);
    await createIndexes(drugIndexFieldNames, drugCollectionName, dbCon);
    console.log(`DB Indexes created`);

    const aeCursor = await dbCon
      .collection(aeCollectionName)
      .find(
        {
          'patient.drug': {
            $elemMatch: {
              drugcharacterization: { $in: ['1', '3'] },
              openfda: { $exists: true, $ne: {} },
            },
          },
        },
        { 'patient.drug': 1, safetyreportid: 1 }
      )
      .addCursorFlag('noCursorTimeout', true);

    console.log('Searching for Adverse Events matching Drugs.');
    let adverseEvents = [];
    while (await aeCursor.hasNext()) {
      const aeRecord = await aeCursor.next();
      adverseEvents.push(aeRecord);
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
