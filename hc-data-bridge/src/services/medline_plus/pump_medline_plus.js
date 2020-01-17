/**
 * Pumps MedlinePlus records to chosen collection.
 */

const args = require('optimist').argv;
const _ = require('lodash');
const Promise = require('bluebird');
const unzipper = require('unzipper');
const request = require('request');
const moment = require('moment');
const { parseString: parseXmlString } = require('../util/parse_xml_string');
const { mongoConnect } = require('../util/mongo');
const { conditionForActualRecord } = require('../util/mongo');

const downloadUrl = args.mplusTopicsCompressedUrl;

function urlsForLastDays(days) {
  const urls = [];
  let curUtc = moment.utc();
  for (let i = 0; i < days; i++) {
    urls.push(`https://medlineplus.gov/xml/mplus_topics_compressed_${curUtc.format('YYYY-MM-DD')}.zip`);
    curUtc = curUtc.subtract(1, 'day');
  }
  return urls;
}

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

  const response = await dbCon
    .collection(medlinePlusCollectionName)
    .findOneAndReplace({ id: doc.id }, { ...conditionForActualRecord, ...doc }, { upsert: true });

  if (response.lastErrorObject.updatedExisting) {
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

async function getDirectory() {
  let directory;
  try {
    if (downloadUrl) {
      console.log(`Downloading url ${downloadUrl}`);
      directory = await unzipper.Open.url(request, downloadUrl);
    } else {
      const days = 30;
      console.log(`Trying to find url by last ${days} days...`);
      const urls = urlsForLastDays(days);
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        console.log(`Trying to download url ${url}`);
        directory = await unzipper.Open.url(request, url).catch(() =>
          console.warn(`Unable to download file by ${url}.`)
        );
        if (directory) {
          console.log(`Successful download by ${url}`);
          break;
        }
      }
    }
  } catch (e) {
    console.error(`Error occurred while downloading file.`, e.stack);
  }
  return directory;
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    const indexFieldNames = ['title', 'mesh-heading', 'also-called'];
    await createIndexes(indexFieldNames, dbCon);
    console.log(`DB Indexes created: ${indexFieldNames.join(', ')}`);

    const directory = await getDirectory();
    if (!directory) {
      process.exit(1);
    }
    const file = directory.files[0];
    const xmlString = (await file.buffer()).toString();
    const obj = parseXmlString(xmlString);
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
