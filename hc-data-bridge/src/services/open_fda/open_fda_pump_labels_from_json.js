const args = require('optimist').argv;
const { MongoClient } = require('mongodb');
const _ = require('lodash');
const fs = require('fs-extra');
const request = require('request');
const progress = require('request-progress');
const readline = require('readline');
const path = require('path');
const unzip = require('unzip');
const JSONStream = require('JSONStream');
const es = require('event-stream');
const Promise = require('bluebird');
const fetch = require('node-fetch');
const { isValidMongoDbUrl } = require('../../lib/helper');
const { getNormalizedNDCByPackageNDC } = require('../rxnav/ndc_rxcui_helper');

class PumpLabelsOpenFda {
  constructor(params) {
    this.dbCon = null;
    this.docsProcessed = 0;
    this.downloadJsonUrl = params.downloadJsonUrl;
    this.mongoUrl = params.mongoUrl;
    this.openFdaCollectionName = params.openFdaCollectionName;
    this.medicationMasterCollectionName = params.medicationMasterCollectionName;

    this.zipDir = path.resolve(__dirname, `./resources/zip`);
    fs.ensureDirSync(this.zipDir);
    this.jsonDir = path.resolve(__dirname, `./resources/json`);
    fs.ensureDirSync(this.jsonDir);
  }

  pump() {
    return this.getLabelFilesInfo()
      .then(labelFilesInfo => {
        const jsonStr = JSON.stringify(labelFilesInfo, null, 2);
        const labelFilesInfoPath = path.resolve(__dirname, `./resources/labelFilesInfo.json`);
        fs.outputFileSync(labelFilesInfoPath, jsonStr);

        this.urlsToDownload = labelFilesInfo.partitions.map(p => p.file);
        return this.downloadAndPumpFiles();
      })
      .then(() => {
        console.log(`Records processed: ${this.docsProcessed}`);
      });
  }

  getLabelFilesInfo() {
    return fetch(this.downloadJsonUrl)
      .then(res => {
        if (res.status === 200) {
          return res.json();
        }
        throw `Cannot download 'download.json' by url ${this.downloadJsonUrl}`;
      })
      .then(json => json.results.drug.label);
  }

  getConnection() {
    return new Promise((resolve, reject) => {
      MongoClient.connect(
        this.mongoUrl,
        (err, dbConnection) => {
          if (err) {
            reject(`Cannot get connection to ${mongoUrl}`);
            return;
          }
          this.dbCon = dbConnection;
          resolve();
        }
      );
    });
  }

  ensureIndexes() {
    return Promise.all([
      this.dbCon.collection(this.openFdaCollectionName).ensureIndex({ id: 1 }),
      this.dbCon.collection(this.medicationMasterCollectionName).ensureIndex({ ndc11: 1 }),
    ]);
  }

  downloadAndPumpFiles() {
    let promise = this.getConnection().then(() => this.ensureIndexes());

    _.forEach(this.urlsToDownload, urlToDownload => {
      promise = promise
        .then(() => this.downloadFile(urlToDownload))
        .then(zipPath => this.pumpZipFile(zipPath));
    });
    return promise;
  }

  downloadFile(urlToDownload) {
    const filename = urlToDownload.substring(urlToDownload.lastIndexOf('/'));
    return new Promise((resolve, reject) => {
      console.log(`Started downloading file by url: ${urlToDownload}`);
      const outputPath = path.join(this.zipDir, filename);

      progress(request(urlToDownload), {})
        .on('progress', state => {
          readline.clearLine(process.stdout, 0); // move cursor to beginning of line
          readline.cursorTo(process.stdout, 0);

          const percent = (100 * state.percent).toFixed(2);
          const speed = (state.speed / 1024).toFixed(1);
          const remaining = state.time.remaining ? state.time.remaining.toFixed(1) : '?';
          process.stdout.write(
            `Downloaded: ${percent}%, speed: ${speed}kbytes/sec, remaining: ${remaining}sec`
          );
        }) // write text
        .on('error', err => {
          console.log(`\nFailed downloading file by url: ${urlToDownload}`);
          reject(err);
        })
        .on('end', () => {
          readline.clearLine(process.stdout, 0); // move cursor to beginning of line
          readline.cursorTo(process.stdout, 0);
          console.log(`File downloaded: ${outputPath}`);
          resolve(outputPath);
        })
        .pipe(fs.createWriteStream(outputPath));
    });
  }

  pumpZipFile(zipPath) {
    return this.parseZipToJson(zipPath)
      .then(unzippedFiles => {
        let promise = Promise.resolve();
        _.forEach(unzippedFiles, unzippedFile => {
          promise = promise.then(() => this.parseJsonAndWriteToMongo(unzippedFile));
        });
        return promise;
      })
      .then(() => {
        console.log(
          `Done pumping file '${zipPath}' to '${this.mongoUrl}' into collections ` +
            `'${this.openFdaCollectionName}' and '${this.medicationMasterCollectionName}'.\n`
        );
      });
  }

  parseZipToJson(zipPath) {
    return new Promise(resolve => {
      const unzippedFiles = [];
      const stream = fs
        .createReadStream(zipPath)
        .pipe(unzip.Parse())
        .on('entry', entry => {
          const fileName = entry.path;
          // const { type } = entry; // 'Directory' or 'File'
          // const { size } = entry;
          const unzippedFile = path.resolve(this.jsonDir, fileName);
          unzippedFiles.push(unzippedFile);
          entry.pipe(fs.createWriteStream(unzippedFile));
        });
      stream.on('close', () => {
        console.log(`File unzipped.`);
        resolve(unzippedFiles);
      });
    });
  }

  parseJsonAndWriteToMongo(jsonPath) {
    console.log('Pumping...');
    return new Promise(resolve => {
      fs.createReadStream(jsonPath)
        .pipe(JSONStream.parse('results'))
        .pipe(
          es.map(results => {
            const promise = Promise.map(
              results,
              result => {
                const packageNdc = _.castArray(result.openfda.package_ndc);
                const doc = {
                  id: result.id,
                  rawData: result,
                  ndc11: _.compact(
                    packageNdc.map(package_ndc => getNormalizedNDCByPackageNDC(package_ndc))
                  ),
                };
                return this.upsertCollections(doc);
              },
              { concurrency: 50 }
            );

            resolve(promise);
          })
        );
    });
  }

  upsertCollections(doc) {
    return this.upsertOpenFdaDoc(doc)
      .then(insertedOpenFdaDoc => this.upsertMedicationMasterDoc(insertedOpenFdaDoc))
      .then(() => {
        this.docsProcessed++;
        if (this.docsProcessed % 5000 === 0) {
          console.log(`OpenFda docs processed: ${this.docsProcessed}`);
        }
      })
      .catch(err => {
        console.log(`Error occurred during upserting doc: ${JSON.stringify(doc)}. \n${err}`);
      });
  }

  upsertMedicationMasterDoc(insertedOpenFdaDoc) {
    // Field generic_name from original doc is size 1 array.
    const genericNames = _.get(insertedOpenFdaDoc, 'rawData.openfda.generic_name.0', '').split(
      ', '
    );
    const brandName = _.get(insertedOpenFdaDoc, 'rawData.openfda.brand_name.0', '');
    // one medication can be packaged in many ways => has many ndc11 codes
    return Promise.map(insertedOpenFdaDoc.ndc11, (ndc11, i) =>
      this.dbCon.collection(this.medicationMasterCollectionName).findAndModify(
        { ndc11 },
        { _id: 1 },
        {
          $set: {
            openFdaData: { id: insertedOpenFdaDoc._id },
            genericNames,
            brandName,
            srcNdc: _.get(insertedOpenFdaDoc, `rawData.openfda.package_ndc.${i}`, ''),
          },
        },
        { upsert: true }
      )
    );
  }

  upsertOpenFdaDoc(doc) {
    return this.dbCon
      .collection(this.openFdaCollectionName)
      .findAndModify({ id: doc.id }, { _id: 1 }, doc, { new: true, upsert: true })
      .then(commandResult => commandResult.value);
  }
}

const downloadJsonUrl = 'https://api.fda.gov/download.json';

const mongoUrl = args.mongoUrl;
const openFdaCollectionName = args.openFdaCollectionName;
const medicationMasterCollectionName = args.medicationMasterCollectionName;

if (!openFdaCollectionName || !medicationMasterCollectionName || !isValidMongoDbUrl(mongoUrl)) {
  console.log(
    `One of param 'openFdaCollectionName' or 'medicationMasterCollectionName' or 'mongoUrl' is invalid`
  );
  process.exit(1);
}

const pumpOpenFda = new PumpLabelsOpenFda({
  downloadJsonUrl,
  mongoUrl,
  openFdaCollectionName,
  medicationMasterCollectionName,
});

pumpOpenFda
  .pump()
  .then(() => {
    console.log(`All files are downloaded and pumped.`);
    process.exit(0);
  })
  .catch(err => {
    console.log(err);
  });

const a = {
  'health-topics': {
    '@total': '2057',
    '@date-generated': '02/06/2019 02:30:35',
    'health-topic': [
      {
        '@meta-desc':
          'If you are being tested for Type 2 diabetes, your doctor gives you an A1C test. The test is also used to monitor your A1C levels.',
        '@title': 'A1C',
        '@url': 'https://medlineplus.gov/a1c.html',
        '@id': '6308',
        '@language': 'English',
        '@date-created': '12/22/2015',
        'full-summary':
          "<p>A1C is a blood test for <a href='https://medlineplus.gov/diabetestype2.html'>type 2 diabetes</a> and <a href='https://medlineplus.gov/prediabetes.html'>prediabetes</a>. It measures your average blood glucose, or <a href='https://medlineplus.gov/bloodsugar.html'>blood sugar</a>, level over the past 3 months. Doctors may use the A1C alone or in combination with other diabetes tests to make a diagnosis. They also use the A1C to see how well you are managing your diabetes. This test is different from the blood sugar checks that people with diabetes do every day.</p>\r\n\r\n<p>Your A1C test result is given in percentages. The higher the percentage, the higher your blood sugar levels have been:</p>\r\n<ul>\r\n<li>A normal A1C level is below 5.7 percent</li>\r\n<li>Prediabetes is between 5.7 to 6.4 percent. Having prediabetes is a risk factor for getting type 2 diabetes. People with prediabetes may need retests every year.</li>\r\n<li>Type 2 diabetes is above 6.5 percent</li>\r\n<li>If you have diabetes, you should have the A1C test at least twice a year. The A1C goal for many people with diabetes is below 7. It may be different for you. Ask what your goal should be. If your A1C result is too high, you may need to change your diabetes care plan.</li>\r\n</ul>\r\n\r\n<p >NIH: National Institute of Diabetes and Digestive and Kidney Diseases</p>",
        'also-called': ['Glycohemoglobin', 'HbA1C', 'Hemoglobin A1C test'],
        group: [
          {
            '@url': 'https://medlineplus.gov/diagnostictests.html',
            '@id': '25',
            '#text': 'Diagnostic Tests',
          },
          {
            '@url': 'https://medlineplus.gov/diabetesmellitus.html',
            '@id': '45',
            '#text': 'Diabetes Mellitus',
          },
        ],
        'language-mapped-topic': {
          '@url': 'https://medlineplus.gov/spanish/a1c.html',
          '@id': '6309',
          '@language': 'Spanish',
          '#text': 'Prueba de hemoglobina glicosilada (HbA1c)',
        },
        'mesh-heading': { descriptor: { '@id': 'D006442', '#text': 'Glycated Hemoglobin A' } },
        'other-language': {
          '@vernacular-name': 'español',
          '@url': 'https://medlineplus.gov/spanish/a1c.html',
          '#text': 'Spanish',
        },
        'primary-institute': {
          '@url': 'https://www.niddk.nih.gov',
          '#text': 'National Institute of Diabetes and Digestive and Kidney Diseases',
        },
        'see-reference': 'Hemoglobin A1c',
        site: [
          {
            '@title': 'A1C and eAG',
            '@url':
              'http://www.diabetes.org/living-with-diabetes/treatment-and-care/blood-glucose-control/a1c/',
            '@language-mapped-url':
              'http://www.diabetes.org/es/vivir-con-diabetes/tratamiento-y-cuidado/el-control-de-la-glucosa-en-la-sangre/a1c-y-eag.html?loc=lwd-es-slabnav',
            'information-category': 'Learn More',
            organization: 'American Diabetes Association',
          },
          {
            '@title': 'A1C test',
            '@url': 'https://medlineplus.gov/ency/article/003640.htm',
            '@language-mapped-url': 'https://medlineplus.gov/spanish/ency/article/003640.htm',
            'information-category': 'Patient Handouts',
            organization: 'Medical Encyclopedia',
          },
          {
            '@title': 'A1C Test and Diabetes',
            '@url':
              'https://www.niddk.nih.gov/health-information/diabetes/overview/tests-diagnosis/a1c-test',
            'information-category': 'Learn More',
            organization: 'National Institute of Diabetes and Digestive and Kidney Diseases',
            'standard-description': 'NIH',
          },
          {
            '@title': 'Blood Test: Hemoglobin A1C',
            '@url': 'https://kidshealth.org/en/parents/blood-test-hba1c.html',
            '@language-mapped-url': 'https://kidshealth.org/es/parents/blood-test-hba1c-esp.html',
            'information-category': 'Learn More',
            organization: 'Nemours Foundation',
          },
          {
            '@title': 'ClinicalTrials.gov: Hemoglobin A, Glycosylated',
            '@url':
              'https://clinicaltrials.gov/search/open/intervention=%22Hemoglobin+A,+Glycosylated%22',
            'information-category': 'Clinical Trials',
            organization: 'National Institutes of Health',
            'standard-description': 'NIH',
          },
          {
            '@title':
              'For People of African, Mediterranean, or Southeast Asian Heritage: Important Information about Diabetes Blood Tests',
            '@url':
              'https://www.niddk.nih.gov/health-information/diagnostic-tests/diabetes-blood-tests-african-mediterranean-southeast-asian',
            'information-category': 'Learn More',
            organization: 'National Institute of Diabetes and Digestive and Kidney Diseases',
            'standard-description': 'NIH',
          },
          {
            '@title': 'Hemoglobin A1C (HbA1c) Test',
            '@url': 'https://medlineplus.gov/lab-tests/hemoglobin-a1c-hba1c-test/',
            '@language-mapped-url':
              'https://medlineplus.gov/spanish/pruebas-de-laboratorio/prueba-de-hemoglobina-a1c/',
            'information-category': 'Learn More',
            organization: 'National Library of Medicine',
            'standard-description': 'NIH',
          },
          {
            '@title': 'Know Your Blood Sugar Numbers: Use Them to Manage Your Diabetes',
            '@url':
              'https://www.niddk.nih.gov/health-information/diabetes/overview/managing-diabetes/know-blood-sugar-numbers',
            '@language-mapped-url':
              'https://www.niddk.nih.gov/health-information/informacion-de-la-salud/diabetes/informacion-general/control/4-pasos-controlar-vida/conozca-niveles-azucar-sangre',
            'information-category': 'Learn More',
            organization: 'National Diabetes Education Program',
            'standard-description': ['NIH', 'Easy-to-Read'],
          },
          {
            '@title': 'A1C',
            '@url':
              'https://www.ncbi.nlm.nih.gov/pubmed/?term=Hemoglobin+A,Glycosylated[Majr]+English[la]+humans[mh]+(jsubsetk[text]+OR+patient+education+handout[pt]+OR+jsubsetn[text]+OR+jsubsetaim[text]+OR+systematic[sb]+OR+review[pt])+NOT+(case+reports[pt]+OR+editorial[pt]+OR+letter[pt])+AND+%22last+1+year%22[edat]',
            'information-category': 'Journal Articles',
          },
        ],
      },
    ],
  },
};
