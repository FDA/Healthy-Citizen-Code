const glob = require('glob');
const fs = require('fs');
const _ = require('lodash');
const { MongoClient } = require('mongodb');

class FhirBundlesLoader {
  constructor (inputSettings) {
    const { bundlesPath, mongoUrl } = inputSettings;
    this.bundlesPath = bundlesPath;
    this.mongoUrl = mongoUrl;
    this.dbcon = null;
  }

  checkInitialErrors () {
    const errorUrls = [];
    return Promise.all([
      this.checkConnection(this.mongoUrl, errorUrls),
    ]).then(() => {
      if (errorUrls.length) {
        throw new Error(`Cannot connect to: ${errorUrls.join(', ')}`);
      }
    });
  }

  checkConnection (url, errorUrls) {
    const fhirBundlesLoader = this;
    return new Promise((resolve, reject) => {
      MongoClient.connect(url, (err, db) => {
        if (err) {
          errorUrls.push(url);
          resolve();
          return;
        }
        console.log(`Get connection url: ${fhirBundlesLoader.mongoUrl} `);
        fhirBundlesLoader.dbCon = db;
        resolve(db);
      });
    });
  }

  processSettings () {
    const fhirBundlesLoader = this;
    let promises = [];
    const bundleFiles = glob.sync(`${fhirBundlesLoader.bundlesPath}/**/*.json`);
    _.forEach(bundleFiles, (bundleFile) => {
      const bundleJSON = JSON.parse(fs.readFileSync(bundleFile));
      promises = promises.concat(this.loadBundle(bundleJSON));
    });
    return Promise.all(promises)
      .then(() => {
        fhirBundlesLoader.isSuccessful = true;
        console.log(`Loaded bundles from dir '${fhirBundlesLoader.bundlesPath}' to Mongo '${fhirBundlesLoader.mongoUrl}'. ${promises.length} resources loaded.`);
      });
  }

  loadBundle (bundle) {
    const entries = bundle.entry;
    const promises = [];
    _.forEach(entries, (entry) => {
      promises.push(this.loadEntry(entry));
    });
    return promises;
  }

  loadEntry (entry) {
    const { resource } = entry;
    const { id } = resource;
    const collectionName = `${resource.resourceType}s`;
    return this.dbCon.collection(collectionName)
      .update({ _id: id }, resource, { upsert: true })
      .then((commandResult) => {
        if (commandResult.result.nModified === 1) {
          console.log(`Updated entry in ${collectionName} with id: ${id}`);
        } else {
          console.log(`Inserted entry in ${collectionName} with id: ${id}`);
        }
        return true;
      });
  }
}

// const bundlesPath = '../../../../sample-patients-stu3/out';
// const mongoUrl = 'mongodb://localhost:27017/hc-stage-test';
// const fhirBundlesLoader = new FhirBundlesLoader(bundlesPath, mongoUrl);
// fhirBundlesLoader.load();

module.exports = FhirBundlesLoader;
