const Promise = require('bluebird');
const fs = require('fs-extra');
const path = require('path');
const flow = require('xml-flow');

/**
 * Pumps MedlinePlus records to chosen collection.
 */

const args = require('optimist').argv;
const _ = require('lodash');
const unzip = require('unzip');
const { mongoConnect, setUpdateAtIfRecordChanged } = require('../util/mongo');
const { getDate } = require('../util/date');
const { downloadUsingWget, isUrlExists } = require('../util/download');
const { conditionForActualRecord } =  require('../util/mongo');
const { getWgetProxyParams } = require('../util/proxy');

const { mongoUrl } = args;
if (!mongoUrl) {
  console.log('Please specify mongoUrl');
  process.exit(1);
}

const faersCollectionName = args.faersCollectionName || 'aesFaers';
let zipDestinationDir;
if (!_.isString(args.zipDestinationDir)) {
  zipDestinationDir = path.resolve(__dirname, './resources', 'zip');
} else {
  zipDestinationDir = path.resolve(args.zipDestinationDir);
}
const xmlDestinationDir = path.resolve(zipDestinationDir, '../xml');

async function upsertFaersDoc(dbCon, collection, doc) {
  const { safetyReportId, safetyReportVersion } = doc;
  const reportVersionMsg = `safetyReportId-version: '${safetyReportId}-${safetyReportVersion}'`;

  const res = await dbCon
    .collection(faersCollectionName)
    .findOne({ safetyReportId }, { projection: { safetyReportVersion: 1, rawData: 1, history: 1 } });
  const now = new Date();
  if (!res) {
    await dbCon.collection(faersCollectionName).insertOne({ ...conditionForActualRecord, ...doc, createdAt: now, updatedAt: now });
    return;
    // return console.log(`Inserted elem with ${reportVersionMsg}`);
  }

  if (res.safetyReportVersion === safetyReportVersion) {
    // console.log(`Current version doc is actual, nothing to do. ${reportVersionMsg}`);
    return;
  }

  const history = res.history || [];
  if (res.safetyReportVersion < safetyReportVersion) {
    // prev element becomes a part of history
    history.push(res.rawData);
    history.sort((a, b) => +a.safetyreportversion > +b.safetyreportversion);

    const newDoc = {
      ...conditionForActualRecord,
      ...doc,
      history,
      createdAt: doc.createdAt || now,
      updatedAt: now,
    };
    await dbCon.collection(faersCollectionName).replaceOne({ _id: res._id }, newDoc);
    return; // console.log(`Added newest elem with ${reportVersionMsg}`);
  }

  // check if history contains old element
  if (!history.find(d => d.safetyreportversion === res.safetyreportversion)) {
    history.push(res.rawData);
    history.sort((a, b) => +a.safetyreportversion > +b.safetyreportversion);
    await setUpdateAtIfRecordChanged(
      dbCon.collection(faersCollectionName),
      'updateOne',
      { _id: res._id },
      { $set: { history } }
    );
    // console.log(`Added old elem to history, ${reportVersionMsg}`);
  }
  // console.log(`Skipped old elem, history already includes it. ${reportVersionMsg}`);
}

function getSafetyReportDocFromXmlObj(xmlDoc) {
  // xml-flow adds unnecessary field $name: 'safetyreport'
  const doc = {};

  delete xmlDoc.$name;
  doc.rawData = xmlDoc;
  // convert to number to compare versions
  doc.safetyReportVersion = +xmlDoc.safetyreportversion || 0;
  doc.safetyReportId = +xmlDoc.safetyreportid;
  doc.primarySourceCountry = xmlDoc.primarysourcecountry;
  doc.occurCountry = xmlDoc.occurcountry;
  doc.transmissionDate = xmlDoc.transmissiondate;
  doc.reportType = +xmlDoc.reporttype || undefined;
  doc.serious = +xmlDoc.serious || undefined;
  doc.seriousnessHospitalization = xmlDoc.seriousnesshospitalization === '1';
  doc.seriousnessOther = xmlDoc.seriousnessother === '1'; // always '1'
  doc.receiveDate = getDate(xmlDoc.receivedate);
  doc.receiptDate = getDate(xmlDoc.receiptdate);
  doc.fulfillExpediteCriteria = xmlDoc.fulfillexpeditecriteria === '1';
  doc.companyNumb = xmlDoc.companynumb;
  doc.duplicate = xmlDoc.duplicate === '1';
  if (xmlDoc.reportduplicate) {
    doc.reportDuplicate = {
      duplicateSource: xmlDoc.reportduplicate.duplicatesource,
      duplicateNumb: xmlDoc.reportduplicate.duplicatenumb,
    };
  }
  if (xmlDoc.primarysource) {
    doc.primarySource = {
      reporterCountry: xmlDoc.primarysource.reportercountry,
      qualification: xmlDoc.primarysource.qualification,
    };
  }
  if (xmlDoc.sender) {
    doc.sender = {
      senderType: xmlDoc.sender.sendertype,
      senderOrganization: xmlDoc.sender.senderorganization,
    };
  }
  if (xmlDoc.receiver) {
    doc.receiver = {
      receiverType: xmlDoc.receiver.receivertype,
      receiverOrganization: xmlDoc.receiver.receiverorganization,
    };
  }
  const { patient } = xmlDoc;
  doc.patientOnSetAge = +_.get(patient, 'patientonsetage') || undefined;
  doc.patientAgeGroup = +_.get(patient, 'patientagegroup') || undefined;
  doc.patientOnSetAgeUnit = _.get(patient, 'patientonsetageunit');
  doc.patientWeight = +_.get(patient, 'patientweight') || undefined;
  doc.patientSex = _.get(patient, 'patientsex');
  doc.reactions = _.castArray(_.get(patient, 'reaction', [])).map(r => ({
    reactionMedDraVersionPT: r.reactionmeddraversionpt,
    reactionMedDraPT: r.reactionmeddrapt,
    reactionOutcome: r.reactionoutcome,
  }));
  doc.drugs = _.castArray(_.get(patient, 'drug', [])).map(d => ({
    openfda: {
      rxCuis: _.get(d, 'openfda.rxcui', []).map(rxCui => ({ rxCui })),
    },
    drugCharacterization: d.drugcharacterization,
    medicinalProduct: d.medicinalproduct,
    drugStructureDosageNumb: d.drugstructuredosagenumb,
    drugStructureDosageUnit: d.drugstructuredosageunit,
    drugSeparateDosageNumb: d.drugseparatedosagenumb,
    drugIntervalDosageunitNumb: d.drugintervaldosageunitnumb,
    drugIntervalDosageDefinition: d.drugintervaldosagedefinition,
    drugDosageText: d.drugdosagetext,
    drugAdministrationRoute: d.drugadministrationroute,
    drugIndication: d.drugindication,
    drugStartDate: getDate(d.drugstartdate),
    drugEndDate: getDate(d.drugenddate),
    activeSubstances: (d.activesubstance ? d.activesubstance.split('\\') : []).map(activeSubstance => ({
      activeSubstance,
    })),
  }));
  const summary = _.get(xmlDoc, 'patient.summary', {});
  doc.summary = _.isString(summary) ? summary : summary.narrativeincludeclinical;
  return doc;
}

function upsertXml(xmlPath, dbCon, collection) {
  // hack due to incorrect xmlStream.pause() work
  // xmlStream is EventEmitter and on .pause it trigger sourceStream to pause
  // after calling .pause several elements have time to pass in 'tag:...' callback
  // so we create allPromises basket and a batch we wait for.
  // during waiting of batch promises some promises might be added to allPromises
  const allPromises = [];
  let batch;

  const readStream = fs.createReadStream(xmlPath);
  const xmlStream = flow(readStream);

  return new Promise(resolve => {
    xmlStream.on('tag:safetyreport', async safetyreport => {
      const doc = getSafetyReportDocFromXmlObj(safetyreport);
      allPromises.push(upsertFaersDoc(dbCon, collection, doc));

      if (allPromises.length >= 1000) {
        xmlStream.pause();
        batch = allPromises.splice(0);
        await Promise.all(batch);
        batch = [];
        xmlStream.resume();
      }
    });

    xmlStream.on('end', () => {
      resolve(Promise.all(allPromises));
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
      .on('error', e => console.log(`Error while extracting xml files from zip ${zipPath}. ${e.stack}`));
  });
}

function getNextYQ(since, to = '') {
  const [year, quarter] = since.split('-');
  let y = +year;
  let q = +quarter;
  let [finalYear, finalQuarter] = to.split('-');
  finalYear = +finalYear;
  finalQuarter = +finalQuarter;

  return function*() {
    while (y !== finalYear || q !== finalQuarter) {
      yield [y, q];
      if (q === 4) {
        y++;
        q = 1;
      } else {
        q++;
      }
    }
    yield [y, q];
  };
}

async function getFileInfos() {
  const now = new Date();
  const nowYear = now.getUTCFullYear();
  const nowQuarter = Math.floor(now.getUTCMonth() / 3) + 1;
  const yearQuarterGen = getNextYQ('2012-4', `${nowYear}-${nowQuarter}`)();
  const getUrl = (y, q) => `https://fis.fda.gov/content/Exports/faers_xml_${y}q${q}.zip`;

  const allUrls = [];
  for (const [y, q] of yearQuarterGen) {
    allUrls.push(getUrl(y, q));
  }
  const validUrls = [];
  await Promise.map(allUrls, async url => {
    // if (await isUrlExists(url)) {
    validUrls.push(url);
    // }
  });
  return validUrls.sort().map(url => ({ url, destDir: zipDestinationDir }));
}

function createIndexes(indexFieldNames, dbCon) {
  return Promise.map(indexFieldNames, fieldName =>
    dbCon.collection(faersCollectionName).createIndex({ [fieldName]: 1 })
  );
}

(async () => {
  try {
    const dbCon = await mongoConnect(mongoUrl);
    const indexFieldNames = ['safetyReportId'];
    await createIndexes(indexFieldNames, dbCon);
    console.log(`DB Indexes created: ${indexFieldNames.join(', ')}`);

    console.log(`Getting file info...`);
    const fileInfos = await getFileInfos();
    console.log(`Found files:\n${fileInfos.map(i => i.url).join('\n')}`);

    const zipPaths = await downloadUsingWget(fileInfos, true, getWgetProxyParams());

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
