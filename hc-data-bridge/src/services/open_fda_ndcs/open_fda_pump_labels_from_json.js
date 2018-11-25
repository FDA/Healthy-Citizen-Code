const args = require('optimist').argv;
const {MongoClient} = require('mongodb');
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
const {isValidMongoDbUrl} = require('../../lib/helper');
const {getNormalizedNDCByPackageNDC} = require('../rxnav/ndc_rxcui_helper');

class PumpLabelsOpenFda {
  constructor (params) {
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

  pump () {
    return this.getLabelFilesInfo()
      .then((labelFilesInfo) => {
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

  getLabelFilesInfo () {
    return fetch(this.downloadJsonUrl)
      .then((res) => {
        if (res.status === 200) {
          return res.json();
        }
        throw `Cannot download 'download.json' by url ${this.downloadJsonUrl}`;
      })
      .then(json => json.results.drug.label);
  }

  getConnection () {
    return new Promise((resolve, reject) => {
      MongoClient.connect(this.mongoUrl, (err, dbConnection) => {
        if (err) {
          reject(`Cannot get connection to ${mongoUrl}`);
          return;
        }
        this.dbCon = dbConnection;
        resolve();
      });
    });
  }

  ensureIndexes () {
    return Promise.all([
      this.dbCon.collection(this.openFdaCollectionName).ensureIndex({id: 1}),
      this.dbCon.collection(this.medicationMasterCollectionName).ensureIndex({ndc11: 1}),
    ]);
  }

  downloadAndPumpFiles () {
    let promise = this.getConnection()
      .then(() => this.ensureIndexes());

    _.forEach(this.urlsToDownload, (urlToDownload) => {
      promise = promise
        .then(() => this.downloadFile(urlToDownload))
        .then(zipPath => this.pumpZipFile(zipPath));
    });
    return promise;
  }

  downloadFile (urlToDownload) {
    const filename = urlToDownload.substring(urlToDownload.lastIndexOf('/'));
    return new Promise((resolve, reject) => {
      console.log(`Started downloading file by url: ${urlToDownload}`);
      const outputPath = path.join(this.zipDir, filename);

      progress(request(urlToDownload), {})
        .on('progress', (state) => {
          readline.clearLine(process.stdout, 0); // move cursor to beginning of line
          readline.cursorTo(process.stdout, 0);

          const percent = (100 * state.percent).toFixed(2);
          const speed = (state.speed / 1024).toFixed((1));
          const remaining = state.time.remaining ? (state.time.remaining).toFixed((1)) : '?';
          process.stdout.write(`Downloaded: ${percent}%, speed: ${speed}kbytes/sec, remaining: ${remaining}sec`);
        })// write text
        .on('error', (err) => {
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

  pumpZipFile (zipPath) {
    return this.parseZipToJson(zipPath)
      .then((unzippedFiles) => {
        let promise = Promise.resolve();
        _.forEach(unzippedFiles, (unzippedFile) => {
          promise = promise.then(() => this.parseJsonAndWriteToMongo(unzippedFile));
        });
        return promise;
      })
      .then(() => {
        console.log(`Done pumping file '${zipPath}' to '${this.mongoUrl}' into collections ` +
          `'${this.openFdaCollectionName}' and '${this.medicationMasterCollectionName}'.\n`);
      });
  }

  parseZipToJson (zipPath) {
    return new Promise((resolve) => {
      const unzippedFiles = [];
      const stream = fs.createReadStream(zipPath)
        .pipe(unzip.Parse())
        .on('entry', (entry) => {
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

  parseJsonAndWriteToMongo (jsonPath) {
    console.log('Pumping...');
    return new Promise((resolve) => {
      fs.createReadStream(jsonPath)
        .pipe(JSONStream.parse('results'))
        .pipe(es.map((results) => {
          const promise = Promise.map(results, (result) => {
            const packageNdc = _.castArray(result.openfda.package_ndc);
            const doc = {
              id: result.id,
              rawData: result,
              ndc11: _.compact(packageNdc.map(package_ndc => getNormalizedNDCByPackageNDC(package_ndc))),
            };
            return this.upsertCollections(doc);
          }, {concurrency: 50});

          resolve(promise);
        }));
    });
  }

  upsertCollections (doc) {
    return this.upsertOpenFdaDoc(doc)
      .then(insertedOpenFdaDoc => this.upsertMedicationMasterDoc(insertedOpenFdaDoc))
      .then(() => {
        this.docsProcessed++;
        if (this.docsProcessed % 5000 === 0) {
          console.log(`OpenFda docs processed: ${this.docsProcessed}`);
        }
      })
      .catch((err) => {
        console.log(`Error occurred during upserting doc: ${JSON.stringify(doc)}. \n${err}`);
      });
  }

  upsertMedicationMasterDoc (insertedOpenFdaDoc) {
    // Field generic_name from original doc is size 1 array.
    const genericNames = _.get(insertedOpenFdaDoc, 'rawData.openfda.generic_name.0', '').split(', ');
    const brandName = _.get(insertedOpenFdaDoc, 'rawData.openfda.brand_name.0', '');
    // one medication can be packaged in many ways => has many ndc11 codes
    return Promise.map(insertedOpenFdaDoc.ndc11, (ndc11, i) => this.dbCon.collection(this.medicationMasterCollectionName)
      .findAndModify({ndc11}, {_id: 1}, {
        $set: {
          openFdaData: {id: insertedOpenFdaDoc._id},
          genericNames,
          brandName,
          srcNdc: _.get(insertedOpenFdaDoc, `rawData.openfda.package_ndc.${i}`, ''),
        },
      }, {upsert: true}));
  }

  upsertOpenFdaDoc (doc) {
    return this.dbCon.collection(this.openFdaCollectionName)
      .findAndModify({id: doc.id}, {_id: 1}, doc, {new: true, upsert: true})
      .then(commandResult => commandResult.value);
  }
}

const downloadJsonUrl = 'https://api.fda.gov/download.json';

const mongoUrl = args.mongoUrl;
const openFdaCollectionName = args.openFdaCollectionName;
const medicationMasterCollectionName = args.medicationMasterCollectionName;

if (!openFdaCollectionName || !medicationMasterCollectionName || !isValidMongoDbUrl(mongoUrl)) {
  console.log(`One of param 'openFdaCollectionName' or 'medicationMasterCollectionName' or 'mongoUrl' is invalid`);
  process.exit(1);
}

const pumpOpenFda = new PumpLabelsOpenFda({
  downloadJsonUrl,
  mongoUrl,
  openFdaCollectionName,
  medicationMasterCollectionName,
});

pumpOpenFda.pump()
  .then(() => {
    console.log(`All files are downloaded and pumped.`);
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
  });
