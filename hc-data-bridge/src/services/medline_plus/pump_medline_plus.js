/**
 * Pumps MedlinePlus records to chosen collection.
 */

const args = require('optimist').argv;
const _ = require('lodash');
const Promise = require('bluebird');
const mongoConnect = Promise.promisify(require('mongodb').MongoClient.connect);
const unzipper = require('unzipper');
const request = require('request');
const { parse: parseXml } = require('fast-xml-parser');

// const lastAvailableDay = new Date().toISOString().split('T')[0];
const lastAvailableDay = '2019-02-16';
const downloadUrl =
  args.mplusTopicsCompressed ||
  `https://medlineplus.gov/xml/mplus_topics_compressed_${lastAvailableDay}.zip`;

const { mongoUrl } = args;
if (!mongoUrl) {
  console.log('Please specify mongoUrl');
  process.exit(1);
}

const medlinePlusCollectionName = args.medlinePlusCollectionName || 'medlinePlus';

async function upsertMedlineDoc(doc, dbCon) {
  doc.rawData = _.clone(doc);
  // 'mesh-heading' might be undefined/obj with field 'descriptor'/array of such obj. Cast it to array of strings
  doc['mesh-heading'] = _.castArray(doc['mesh-heading'] || {})
    .map(obj => _.get(obj, 'descriptor.#text'))
    .filter(str => str);

  // 'also-called' might be undefined/string/array. Cast it to array of strings
  doc['also-called'] = _.castArray(doc['also-called']).filter(str => str);

  // rewrite xml attrs represented by key '@_keyName' to key 'keyName'
  _.each(doc, (val, key) => {
    if (key.startsWith('@_')) {
      doc[key.substr(2)] = val;
      delete doc[key];
    }
  });

  const {
    lastErrorObject: { updatedExisting },
  } = await dbCon
    .collection(medlinePlusCollectionName)
    .findOneAndUpdate({ id: doc.id }, doc, { upsert: true });

  if (updatedExisting) {
    console.log(`Updated entry with title: '${doc.title}'`);
  } else {
    console.log(`Inserted entry with title: '${doc.title}'`);
  }
}

function createIndexes(indexFieldNames, dbCon) {
  return Promise.map(indexFieldNames, fieldName =>
    dbCon.collection(medlinePlusCollectionName).createIndex({ [fieldName]: 1 })
  );
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl, require('../util/mongo_connection_settings'));
    const indexFieldNames = ['title', 'mesh-heading', 'also-called'];
    await createIndexes(indexFieldNames, dbCon);
    console.log(`DB Indexes created: ${indexFieldNames.join(', ')}`);

    console.log(`Downloading url ${downloadUrl}`);
    const directory = await unzipper.Open.url(request, downloadUrl);
    const file = directory.files[0];
    const xmlData = (await file.buffer()).toString();
    const obj = parseXml(xmlData, { ignoreAttributes: false });
    console.log(`Xml downloaded and parsed`);

    console.log(`Upserting health...\n`);
    const healthTopics = obj['health-topics']['health-topic'];
    await Promise.map(healthTopics, healthTopic => upsertMedlineDoc(healthTopic, dbCon));

    console.log('\nDone pumping Medline Plus data');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while Medline Plus data', e);
    process.exit(1);
  }
})();
