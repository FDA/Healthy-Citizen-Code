/**
 * Current file pumps tree of icd codes as a plain structure preserving parent.
 * Source is downloaded from ftp://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2019/icd10cm_tabular_2019.xml
 */

const args = require('optimist').argv;
const path = require('path');
const _ = require('lodash');
const Promise = require('bluebird');
const fs = require('fs-extra');
const mongoConnect = Promise.promisify(require('mongodb').MongoClient.connect);
const { parseFile } = require('../util/parse_xls_string');
const { downloadFile } = require('../util/download');

const ICD_TREE_XML_PATH = path.resolve(__dirname, './resources/icd10cm_tabular.xml');
const downloadIcdTreeUrl =
  args.mplusTopicsCompressed ||
  'ftp://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2019/icd10cm_tabular_2019.xml';

const { mongoUrl } = args;
if (!mongoUrl) {
  console.log('Please specify mongoUrl');
  process.exit(1);
}

const icdCollectionName = args.icdCollectionName || 'icdcodes';

async function upsertIcdDoc(doc, dbCon) {
  const { code, name } = doc;
  const {
    lastErrorObject: { updatedExisting, upserted },
    value,
  } = await dbCon.collection(icdCollectionName).findOneAndUpdate({ code }, doc, { upsert: true });

  if (updatedExisting) {
    console.log(`Updated entry code: ${code}, name: ${name}`);
    return value;
  } else {
    console.log(`Inserted entry code: ${code}, name: ${name}`);
    return { ...doc, _id: upserted };
  }
}

async function handleDiagnosis(diag, dbCon, parent) {
  const icdCodeRecord = {
    rawData: _.pick(diag, ['name', 'desc', 'inclusionTerm', 'excludes1', 'excludes2']),
    code: diag.name[0],
    name: diag.desc[0],
  };

  const noteFields = ['inclusionTerm', 'excludes1', 'excludes2'];
  _.each(noteFields, noteField => {
    const noteFieldVal = _.get(diag, `${noteField}.0.note`);
    if (noteFieldVal) {
      icdCodeRecord[noteField] = noteFieldVal;
    }
  });

  if (parent) {
    icdCodeRecord.parent = {
      table: icdCollectionName,
      label: parent.name,
      _id: parent._id,
    };
  }
  const nestedDiagnoses = diag.diag || [];
  icdCodeRecord.hasChildren = !_.isEmpty(nestedDiagnoses);

  const upsertedIcdDoc = await upsertIcdDoc(icdCodeRecord, dbCon);

  return Promise.map(nestedDiagnoses, nestedDiag =>
    handleDiagnosis(nestedDiag, dbCon, upsertedIcdDoc)
  );
}

function handleSections(sections, dbCon) {
  return Promise.map(sections, async section => {
    const diagnoses = section.diag || [];
    return Promise.map(diagnoses, diag => handleDiagnosis(diag, dbCon));
  });
}

async function pumpICDTree(dbCon, xmlObj) {
  const chapters = _.get(xmlObj, ['ICD10CM.tabular', 'chapter']);
  await Promise.map(chapters, chapter => {
    const sections = chapter.section;
    return handleSections(sections, dbCon);
  });
}

function createIndexes(indexFieldNames, dbCon) {
  return Promise.map(indexFieldNames, fieldName =>
    dbCon.collection(icdCollectionName).createIndex({ [fieldName]: 1 })
  );
}

async function getXml () {
  const isFileExists = await fs.exists(ICD_TREE_XML_PATH);
  if (!isFileExists) {
    console.log(`Downloading file by url: ${downloadIcdTreeUrl}`);
    await downloadFile(downloadIcdTreeUrl, ICD_TREE_XML_PATH);
  }
  return parseFile(ICD_TREE_XML_PATH);
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl, require('../util/mongo_connection_settings'));
    const indexFieldNames = ['code', 'name', 'hasChildren', 'parent._id'];
    await createIndexes(indexFieldNames, dbCon);
    console.log(`DB Indexes created: ${indexFieldNames.join(', ')}`);

    const xmlObj = await getXml(ICD_TREE_XML_PATH);

    console.log(`Pumping ICD codes\n`);
    await pumpICDTree(dbCon, xmlObj);
    console.log('\nDone pumping ICD codes');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while pumping icd tree codes', e);
    process.exit(1);
  }
})();
