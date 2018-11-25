const { MongoClient } = require('mongodb');
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const unzip = require('unzip');
const JSONStream = require('JSONStream');
const es = require('event-stream');
const Promise = require('bluebird');
const fetch = require('node-fetch');
const { isValidMongoDbUrl } = require('../../../lib/helper');
const sh = require('shelljs');
const objectHash = require('object-hash');

// wget settings
const CONNECT_TIMEOUT = 5; // sometimes one of many IPs cannot respond, reduce default 60sec to 5 sec
const TRIES = 5;

class PumpRawResourceOpenFda {
  constructor (settings) {
    const { errors, resultSettings } = this._validateSettings(settings);
    if (!_.isEmpty(errors)) {
      throw new Error(`Invalid settings passed: ${errors.join('; ')}`);
    }
    this.settings = {
      downloadJsonUrl: 'https://api.fda.gov/download.json',
      fileDestination: './resources',
      resources: resultSettings,
    };
    this.zipDir = path.resolve(__dirname, this.settings.fileDestination, 'zip');
    this.jsonDir = path.resolve(__dirname, this.settings.fileDestination, 'json');
    this.dbCon = null;
    this.SPLITTER = '--------------------';
  }

  _validateSettings (settings) {
    const resultSettings = _.isArray(settings) ? settings : _.castArray(settings);
    const res = {
      errors: [],
      resultSettings,
    };
    if (!Array.isArray(resultSettings) || (Array.isArray(resultSettings) && settings.length === 0)) {
      res.errors.push(`Should be a not empty array`);
      return res;
    }

    _.forEach(resultSettings, (obj, index) => {
      if (!isValidMongoDbUrl(obj.mongoUrl)) {
        res.errors.push(`${obj.mongoUrl} at index ${index} is not a valid mongo db url`);
      }
      if (!_.isString(obj.destCollectionName)) {
        res.errors.push(`${obj.destCollectionName} at index ${index} is not a valid destination collection name`);
      }
      if (!_.isString(obj.resourcePath)) {
        res.errors.push(`${obj.resourcePath} at index ${index} is not a valid resource path`);
      }
      if (!_.isFunction(obj.fileFilter)) {
        obj.fileFilter = file => true;
      }
      if (!_.isFunction(obj.getDocId)) {
        obj.getDocId = doc => objectHash.sha1(doc);
      }
    });
    return res;
  }

  _download (fileInfos, dir) {
    return Promise.mapSeries(fileInfos, (fileInfo) => {
      const { url, subDir } = fileInfo;
      const destination = path.resolve(dir, subDir);
      const command = `wget -N '${url}' -P '${destination}' --connect-timeout ${CONNECT_TIMEOUT} --tries ${TRIES} --progress=dot:mega`;
      return new Promise((resolve, reject) => {
        sh.exec(command, (code, stdout, stderr) => {
          if (code === 0) {
            const filePath = path.resolve(destination, url.substr(url.lastIndexOf('/') + 1));
            resolve(filePath);
          } else {
            reject();
          }
        });
      });
    });
  }

  pump () {
    return this._getDownloadFilesInfo()
      .then((downloadFilesInfo) => {
        this.downloadFilesInfo = downloadFilesInfo;

        console.log(`Start downloading files`);
        console.log(this.SPLITTER);

        return Promise.map(this.settings.resources, (resMeta) => {
          const resourceMeta = _.get(this.downloadFilesInfo, resMeta.resourcePath, {});
          if (!resourceMeta.partitions) {
            console.log(`There is no resource for path ${resMeta.resourcePath}`);
            return { ...resMeta, zipPaths: null };
          }
          const fileInfos = resourceMeta.partitions
            .filter(p => resMeta.fileFilter(p.file, _))
            .map((p) => {
              const domainRegExp = /(?:https?:\/\/)?.+?\//;
              const match = domainRegExp.exec(p.file);
              const indexAfterFirstSlash = match.index + match[0].length;
              const indexBeforeLastSlash = p.file.lastIndexOf('/');
              const subDir = p.file.substring(indexAfterFirstSlash, indexBeforeLastSlash);
              return { subDir, url: p.file };
            });
          return this._download(fileInfos, this.zipDir)
            .then(zipPaths => ({
              ...resMeta,
              zipPaths,
            }));
        });
      })
      .then((downloadedResMetas) => {
        const resMetas = downloadedResMetas.filter(resMeta => resMeta.zipPaths !== null);
        return Promise.mapSeries(resMetas, (resMeta) => {
          console.log(this.SPLITTER);
          console.log(`Start processing for resource ${resMeta.resourcePath}`);
          return this._saveArchivesToMongo(resMeta)
            .then(() => {
              console.log(`Finish processing for resource ${resMeta.resourcePath}`);
              console.log(this.SPLITTER);
            });
        });
      });
  }

  _getDownloadFilesInfo () {
    return fetch(this.settings.downloadJsonUrl)
      .then((res) => {
        if (res.status === 200) {
          return res.json();
        }
        throw new Error(`Cannot download 'download.json' by url ${this.settings.downloadJsonUrl}`);
      })
      .then(json => json.results);
  }

  _saveArchivesToMongo (resMeta) {
    return new Promise((resolve, reject) => {
      MongoClient.connect(resMeta.mongoUrl, (err, dbConnection) => {
        if (err) {
          reject(`Cannot get connection to ${resMeta.mongoUrl}`);
          return;
        }
        resMeta.dbCon = dbConnection;
        resolve();
      });
    })
      .then(() => resMeta.dbCon.collection(resMeta.destCollectionName).createIndex({ id: 1 }))
      .then(() => Promise.mapSeries(resMeta.zipPaths, (zipPath) => {
        console.log(`Unzipping file ${zipPath}`);
        return this._parseZipToJson(zipPath)
          .then(unzippedFiles => Promise.mapSeries(unzippedFiles, (unzippedFile) => {
            console.log(`Saving to mongo file ${unzippedFile}`);
            return this._parseJsonAndWriteToMongo(resMeta, unzippedFile)
              .then(() => {
                fs.unlinkSync(unzippedFile);
                console.log(`Deleted ${unzippedFile}`);
              });
          }));
      }));
  }

  _parseZipToJson (zipPath) {
    return new Promise((resolve) => {
      const nestedZipPath = zipPath.substring(this.zipDir.length + 1, zipPath.lastIndexOf('/'));
      const jsonNestedDir = path.resolve(this.jsonDir, nestedZipPath);
      fs.ensureDirSync(jsonNestedDir);

      const unzippedFiles = [];
      const stream = fs.createReadStream(zipPath)
        .pipe(unzip.Parse())
        .on('entry', (entry) => {
          const fileName = entry.path;
          const unzippedFile = path.resolve(__dirname, jsonNestedDir, fileName);
          unzippedFiles.push(unzippedFile);
          entry.pipe(fs.createWriteStream(unzippedFile));
        });
      stream.on('close', () => {
        resolve(unzippedFiles);
      });
    });
  }

  _parseJsonAndWriteToMongo (resMeta, jsonPath) {
    return new Promise((resolve) => {
      fs.createReadStream(jsonPath)
        .pipe(JSONStream.parse('results'))
        .pipe(es.map((results) => {
          const promise = Promise.map(results, (result, index) => {
            const docId = resMeta.getDocId(result, _);
            if (!docId) {
              console.log(`Cannot find id in doc, it will be skipped. Doc index: ${index}`);
              return Promise.resolve();
            }
            const doc = {
              id: docId,
              rawData: result,
            };
            return this._upsertOpenFdaDoc(resMeta, doc);
          }, { concurrency: 50 });

          resolve(promise);
        }));
    });
  }

  _upsertOpenFdaDoc (resMeta, doc) {
    return resMeta.dbCon.collection(resMeta.destCollectionName)
      .findAndModify({ id: doc.id }, { _id: 1 }, doc, { new: true, upsert: true })
      .then(commandResult => commandResult.value);
  }
}

module.exports = PumpRawResourceOpenFda;
