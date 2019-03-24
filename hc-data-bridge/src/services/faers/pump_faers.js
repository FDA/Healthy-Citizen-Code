const Promise = require('bluebird');
const fs = require('fs-extra');
const path = require('path');
const flow = require('xml-flow');

/**
 * Pumps MedlinePlus records to chosen collection.
 */

const args = require('optimist').argv;
const _ = require('lodash');
const mongoConnect = Promise.promisify(require('mongodb').MongoClient.connect);
const unzip = require('unzip');
const { downloadUsingWget } = require('../util/download');

const { mongoUrl } = args;
if (!mongoUrl) {
  console.log('Please specify mongoUrl');
  process.exit(1);
}

const faersCollectionName = args.faersCollectionName || 'aeFaers';
let zipDestinationDir;
if (!_.isString(args.zipDestinationDir)) {
  zipDestinationDir = path.resolve(__dirname, './resources', 'zip');
} else {
  zipDestinationDir = path.resolve(args.zipDestinationDir);
}
const xmlDestinationDir = path.resolve(zipDestinationDir, '../xml');


async function upsertFaersDoc(dbCon, collection, doc) {
  const { safetyReportId, safetyReportVersion } = doc;

  // delete doc._id;
  const res = await dbCon.collection(faersCollectionName).findOne({ safetyReportId });
  if (!res) {
    await dbCon.collection(faersCollectionName).insert(doc);
    return console.log(
      `Inserted entry with safetyReportId-version: '${safetyReportId}-${safetyReportVersion}'`
    );
  }

  if (res.safetyreportversion < safetyReportVersion) {
    await dbCon.collection(faersCollectionName).update({ safetyReportId }, doc);
    console.log(
      `Updated entry with safetyReportId-version: '${safetyReportId}-${safetyReportVersion}'`
    );
  } else {
    console.log(
      `Skipped entry with not latest version, safetyReportId-version: '${safetyReportId}-${safetyReportVersion}'`
    );
  }
}

function getDateFrom102Format(date) {
  return date ? new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`) : null;
}

function getSafetyReportDocFromXmlObj(xmlDoc) {
  // xml-flow adds unnecessary fields $name = safetyreport
  const doc = {};

  delete xmlDoc.$name;
  doc.rawData = xmlDoc;
  doc.safetyReportId = +xmlDoc.safetyreportid;
  // convert to number to compare versions
  doc.safetyReportVersion = +xmlDoc.safetyreportversion || 0;
  doc.receiptDate = getDateFrom102Format(xmlDoc.receiptdate);
  doc.reactions = _.castArray(_.get(xmlDoc, 'patient.reaction', [])).map(r => ({
    reactionMedDraPt: r.reactionmeddrapt,
    reactionOutcome: r.reactionoutcome,
  }));
  doc.drugs = _.castArray(_.get(xmlDoc, 'patient.drug', [])).map(d => ({
    drugCharacterization: d.drugcharacterization,
    medicinalProduct: d.medicinalproduct,
    drugIndication: d.drugindication,
    drugEndDate: getDateFrom102Format(d.drugenddate),
    drugStartDate: getDateFrom102Format(d.drugstartdate),
    activeSubstances: getDateFrom102Format(d.drugstartdate),
  }));
  // TODO: resolve 'summary - include narrativeincludeclinical'
  // doc.summary = summary
  return doc;
}

function upsertXml(xmlPath, dbCon, collection) {
  const xmlStream = flow(fs.createReadStream(xmlPath));

  return new Promise(resolve => {
    let promises = [];

    xmlStream.on('tag:safetyreport', async safetyreport => {
      const doc = getSafetyReportDocFromXmlObj(safetyreport);
      promises.push(upsertFaersDoc(dbCon, collection, doc));

      if (promises.length >= 200) {
        xmlStream.pause();
        await Promise.all(promises);
        promises = [];
        xmlStream.resume();
      }
    });

    xmlStream.on('end', () => {
      resolve(Promise.all(promises));
    });
  });
}

async function extractXmlFilesFromZip(zipPath, xmlDestDir) {
  return new Promise(resolve => {
    // const filename = zipPath.substring(zipPath.lastIndexOf('/') + 1);
    // const year = filename.match(/\d\d\d\d/)[0];
    // const xmlNestedDir = path.resolve(xmlDestDir, year);
    fs.ensureDirSync(xmlDestDir);

    const unzippedFiles = [];
    fs.createReadStream(zipPath)
      .pipe(unzip.Parse())
      .on('entry', entry => {
        const filePath = entry.path;
        if (!filePath.endsWith('.xml')) {
          return entry.autodrain();
        }
        const fileName = filePath.slice(filePath.lastIndexOf('/') + 1);
        const unzippedFile = path.resolve(xmlDestDir, fileName);
        unzippedFiles.push(unzippedFile);
        entry.pipe(fs.createWriteStream(unzippedFile));
      })
      .on('close', () => {
        resolve(unzippedFiles);
      })
      .on('error', e =>
        console.log(`Error while extracting xml files from zip ${zipPath}. ${e.stack}`)
      );
  });
}

function getFileInfos() {
  return [
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2012q1.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2012q2.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2012q3.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2012q4.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2013q1.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2013q2.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2013q3.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2013q4.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2014q1.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2014q2.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2014q3.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2014q4.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2015q1.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2015q2.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2015q3.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2015q4.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2016q1.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2016q2.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2016q3.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2016q4.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2017q1.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2017q2.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2017q3.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2017q4.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2018q1.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2018q2.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2018q3.zip', destDir: zipDestinationDir },
    { url: 'https://fis.fda.gov/content/Exports/faers_xml_2018q4.zip', destDir: zipDestinationDir },
  ];
}

function createIndexes(indexFieldNames, dbCon) {
  return Promise.map(indexFieldNames, fieldName =>
    dbCon.collection(faersCollectionName).createIndex({ [fieldName]: 1 })
  );
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl, require('../util/mongo_connection_settings'));
    const indexFieldNames = ['safetyReportId', 'safetyReportVersion'];
    await createIndexes(indexFieldNames, dbCon);
    console.log(`DB Indexes created: ${indexFieldNames.join(', ')}`);

    const fileInfos = getFileInfos();
    const zipPaths = await downloadUsingWget(fileInfos, true);

    await Promise.mapSeries(zipPaths, async zipPath => {
      console.log(`Handling zip ${zipPath}`);
      const xmlPaths = await extractXmlFilesFromZip(zipPath, xmlDestinationDir);
      await Promise.mapSeries(xmlPaths, async xmlPath => {
        console.log(`Handling xml ${xmlPath}`);
        await upsertXml(xmlPath, dbCon, faersCollectionName);
        console.log(`Finished xml ${xmlPath}`);

        fs.unlinkSync(xmlPath);
        console.log(`Deleted xml ${xmlPath}`);
      });
    });

    console.log('\nDone pumping FAERS data');
    process.exit(0);
  } catch (e) {
    console.error('Error occurred while FAERS data', e);
    process.exit(1);
  }
})();
