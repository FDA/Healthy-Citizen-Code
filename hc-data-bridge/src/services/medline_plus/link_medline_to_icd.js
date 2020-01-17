/**
 * Current file links MedlinePlus health topics to icdcode records by inclusionTerm.
 * Source is downloaded from ftp://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2019/icd10cm_tabular_2019.xml
 */

const args = require('optimist').argv;
const _ = require('lodash');
const Promise = require('bluebird');
const { mongoConnect, setUpdateAtIfRecordChanged } = require('../util/mongo');

const { mongoUrl } = args;
if (!mongoUrl) {
  console.log('Please specify mongoUrl');
  process.exit(1);
}

const icdCollectionName = args.icdCollectionName || 'icdcodes';
const medlinePlusCollectionName = args.medlinePlusCollectionName || 'medlinePlus';

async function linkMedlineToIcd(icdDoc, dbCon, parentLookup) {
  const { name, inclusionTerm } = icdDoc;
  const termsToFind = [name, ...(inclusionTerm || [])];
  const matchedDocs = await dbCon
    .collection(medlinePlusCollectionName)
    .find(
      {
        $or: [
          { title: { $in: termsToFind } },
          { 'mesh-heading': { $in: termsToFind } },
          { 'also-called': { $in: termsToFind } },
        ],
      },
      { projection: { _id: 1, title: 1, language: 1 } }
    )
    .toArray();

  let lookup;

  const englishTopics = matchedDocs.filter(d => d.language === 'English');
  const firstEnglishTopic = englishTopics[0];
  if (firstEnglishTopic) {
    lookup = {
      table: medlinePlusCollectionName,
      label: firstEnglishTopic.title,
      _id: firstEnglishTopic._id,
      data: {
        language: firstEnglishTopic.language,
      },
    };
    await setUpdateAtIfRecordChanged(dbCon
      .collection(icdCollectionName)
      , 'updateOne', { _id: icdDoc._id }, { $set: { medlinePlusTopics: lookup } });

    console.log(
      `For ICD with name '${icdDoc.name}' linked 'medlinePlusTopics' own lookup: ${JSON.stringify(lookup, null, 2)}`
    );
  } else if (!_.isEmpty(parentLookup)) {
    lookup = parentLookup;
    await setUpdateAtIfRecordChanged(dbCon
      .collection(icdCollectionName)
      , 'updateOne', { _id: icdDoc._id }, { $set: { medlinePlusTopics: lookup } });

    console.log(
      `For ICD with name '${icdDoc.name}' linked 'medlinePlusTopics' parent lookup: ${JSON.stringify(lookup, null, 2)}`
    );
  }

  if (icdDoc.hasChildren) {
    const childrenRecords = await dbCon
      .collection(icdCollectionName)
      .find({ 'parent._id': { $eq: icdDoc._id } })
      .toArray();
    await Promise.map(childrenRecords, childRecord => linkMedlineToIcd(childRecord, dbCon, lookup));
  }

  return matchedDocs;
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    const icdRootRecords = await dbCon.collection(icdCollectionName).find({ parent: { $eq: null } });

    console.log('Searching for MedlinePlus health topics matching ICD code or name.');
    while (await icdRootRecords.hasNext()) {
      const icdCode = await icdRootRecords.next();
      await linkMedlineToIcd(icdCode, dbCon);
    }
    console.log('\nDone linking MedlinePlus health topics to ICD');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while linking MedlinePlus health topics to ICD', e);
    process.exit(1);
  }
})();
