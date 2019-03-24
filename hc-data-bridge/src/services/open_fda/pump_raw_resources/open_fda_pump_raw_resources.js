const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const unzip = require('unzip');
const JSONStream = require('JSONStream');
const Promise = require('bluebird');
const fetch = require('node-fetch');
const sh = require('shelljs');
const objectHash = require('object-hash');
const mongoConnect = Promise.promisify(require('mongodb').MongoClient.connect);

const transformers = require('./transformers');
const { isValidMongoDbUrl } = require('../../../lib/helper');

// wget settings
const CONNECT_TIMEOUT = 5; // sometimes one of many IPs cannot respond, reduce default 60sec to 5 sec
const TRIES = 5;

class PumpRawResourceOpenFda {
  constructor(settings) {
    this.settings = {
      downloadJsonUrl: 'https://api.fda.gov/download.json',
      defaultZipDir: path.resolve(__dirname, './resources', 'zip'),
      defaultJsonDir: path.resolve(__dirname, './resources', 'json'),
    };

    const { errors, pumpSettings } = this._validateSettings(settings);
    if (!_.isEmpty(errors)) {
      throw new Error(`Invalid settings passed: ${errors.join('; ')}`);
    }
    this.settings.pumpParams = pumpSettings;

    this.connections = {};
    this.SPLITTER = '--------------------';
  }

  _validateSettings(settings) {
    const pumpSettings = _.isArray(settings) ? settings : _.castArray(settings);
    const res = {
      errors: [],
      pumpSettings,
    };
    if (!Array.isArray(pumpSettings) || (Array.isArray(pumpSettings) && settings.length === 0)) {
      res.errors.push(`Should be a not empty array`);
      return res;
    }

    _.forEach(pumpSettings, (obj, index) => {
      if (!isValidMongoDbUrl(obj.mongoUrl)) {
        res.errors.push(`${obj.mongoUrl} at index ${index} is not a valid mongo db url`);
      }
      if (!_.isString(obj.destCollectionName)) {
        res.errors.push(
          `${obj.destCollectionName} at index ${index} is not a valid destination collection name`
        );
      }
      if (!_.isString(obj.resourcePath)) {
        res.errors.push(`${obj.resourcePath} at index ${index} is not a valid resource path`);
      }
      if (!_.isString(obj.zipDestinationDir)) {
        obj.zipDestinationDir = this.settings.defaultZipDir;
        obj.jsonDestinationDir = this.settings.defaultJsonDir;
      } else {
        obj.jsonDestinationDir = path.resolve(obj.zipDestinationDir, '../json');
      }

      if (!obj.transformer) {
        obj.transformer = transformers.def;
      } else if (_.isString(obj.transformer)) {
        const func = transformers[obj.transformer];
        if (func) {
          obj.transformer = func;
        } else {
          res.errors.push(`${obj.transformer} must be defined in 'transformers' module.`);
        }
      } else if (!_.isFunction(obj.transformer)) {
        res.errors.push(`${obj.transformer} should be a function.`);
      }

      if (!_.isFunction(obj.fileFilter)) {
        obj.fileFilter = () => true;
      }
      if (!_.isFunction(obj.getDocId)) {
        obj.getDocId = doc => objectHash.sha1(doc);
      }
    });
    return res;
  }

  _downloadUsingWget(fileInfos) {
    return Promise.mapSeries(fileInfos, fileInfo => {
      const { url, destDir } = fileInfo;
      const command = `wget -N '${url}' -P '${destDir}' --connect-timeout ${CONNECT_TIMEOUT} --tries ${TRIES} --progress=dot:mega`;
      return new Promise((resolve, reject) => {
        sh.exec(command, (code, stdout, stderr) => {
          if (code !== 0) {
            return reject();
          }
          const fileName = url.substr(url.lastIndexOf('/') + 1);
          const filePath = path.resolve(destDir, fileName);
          resolve(filePath);
        });
      });
    });
  }

  pump() {
    console.log(`Downloading openfda all available files list...`);
    return this._getDownloadFilesInfo()
      .then(downloadFilesInfo => {
        this.downloadFilesInfo = downloadFilesInfo;

        console.log(`Start downloading files`);
        console.log(this.SPLITTER);

        return Promise.map(this.settings.pumpParams, paramsObj => {
          const resourceMeta = _.get(this.downloadFilesInfo, paramsObj.resourcePath, {});
          if (!resourceMeta.partitions) {
            console.log(`There is no resource for path ${paramsObj.resourcePath}`);
            return { ...paramsObj, zipPaths: null };
          }

          const { fileFilter, zipDestinationDir } = paramsObj;
          const fileInfos = this._getFileInfos(
            resourceMeta.partitions,
            fileFilter,
            zipDestinationDir
          );
          return this._downloadUsingWget(fileInfos).then(zipPaths => ({
            ...paramsObj,
            zipPaths,
          }));
        });
      })
      .then(downloadedResMetas => {
        const resMetas = downloadedResMetas.filter(resMeta => resMeta.zipPaths !== null);
        return Promise.mapSeries(resMetas, resMeta => {
          console.log(this.SPLITTER);
          console.log(`Start processing for resource '${resMeta.resourcePath}'`);
          return this._saveArchivesToMongo(resMeta).then(() => {
            console.log(`Finished processing for resource '${resMeta.resourcePath}'`);
            console.log(this.SPLITTER);
          });
        });
      });
  }

  /**
   * For each partition files forms directory path by url
   Example: subdir 'drug/event/all_other' for url 'https://download.open.fda.gov/drug/event/all_other/drug-event-0001-of-0004.json.zip'
   */
  _getFileInfos(partitions, fileFilter, zipDestinationDir) {
    const fileInfos = partitions.filter(p => fileFilter(p.file, _)).map(p => {
      const domainRegExp = /(?:https?:\/\/)?.+?\//;
      const match = domainRegExp.exec(p.file);
      const indexAfterFirstSlash = match.index + match[0].length;
      const indexBeforeLastSlash = p.file.lastIndexOf('/');
      const subDir = p.file.substring(indexAfterFirstSlash, indexBeforeLastSlash);
      const destDir = path.resolve(zipDestinationDir, subDir);
      return { destDir, url: p.file };
    });
    return fileInfos;
  }

  _getDownloadFilesInfo() {
    return fetch(this.settings.downloadJsonUrl)
      .then(res => {
        if (res.status === 200) {
          return res.json();
        }
        throw new Error(`Cannot download 'download.json' by url ${this.settings.downloadJsonUrl}`);
      })
      .then(json => json.results);
  }

  _saveArchivesToMongo(resMeta) {
    const {
      mongoUrl,
      destCollectionName,
      zipPaths,
      getDocId,
      transformer,
      zipDestinationDir,
      jsonDestinationDir,
    } = resMeta;

    return new Promise((resolve, reject) => {
      if (this.connections[mongoUrl]) {
        return resolve();
      }

      mongoConnect(mongoUrl, require('../../util/mongo_connection_settings'))
        .then(dbConnection => {
          this.connections[mongoUrl] = dbConnection;
          resolve();
        })
        .catch(err => {
          reject(`Cannot get connection to ${mongoUrl}. ${err.message}`);
        });
    })
      .then(() => this.connections[mongoUrl].collection(destCollectionName).createIndex({ id: 1 }))
      .then(() => {
        const dbCon = this.connections[mongoUrl];

        return Promise.mapSeries(zipPaths, zipPath => {
          console.log(`Unzipping file ${zipPath}`);
          return this._extractJsonFilesFromZip(zipPath, zipDestinationDir, jsonDestinationDir).then(
            unzippedFiles =>
              Promise.mapSeries(unzippedFiles, unzippedFile => {
                console.log(`Saving to mongo file ${unzippedFile}`);
                return this._parseJsonAndWriteToMongo({
                  jsonPath: unzippedFile,
                  dbCon,
                  collection: destCollectionName,
                  getDocId,
                  transformer,
                }).then(() => {
                  fs.unlinkSync(unzippedFile);
                  console.log(`Deleted ${unzippedFile}`);
                });
              })
          );
        });
      });
  }

  _extractJsonFilesFromZip(zipPath, zipDestinationDir, jsonDestinationDir) {
    return new Promise(resolve => {
      // find nestedPath like 'device/enforcement'
      const nestedZipPath = zipPath.substring(
        zipDestinationDir.length + 1,
        zipPath.lastIndexOf('/')
      );
      const jsonNestedDir = path.resolve(jsonDestinationDir, nestedZipPath);
      fs.ensureDirSync(jsonNestedDir);

      const unzippedFiles = [];
      fs.createReadStream(zipPath)
        .pipe(unzip.Parse())
        .on('entry', entry => {
          const fileName = entry.path;
          const unzippedFile = path.resolve(__dirname, jsonNestedDir, fileName);
          unzippedFiles.push(unzippedFile);
          entry.pipe(fs.createWriteStream(unzippedFile));
        })
        .on('close', () => {
          resolve(unzippedFiles);
        })
        .on('error', e =>
          console.log(`Error while extracting json files from zip ${zipPath}. ${e.stack}`)
        );
    });
  }

  _parseJsonAndWriteToMongo({ jsonPath, dbCon, collection, getDocId, transformer }) {
    let promises = [];
    return new Promise(resolve => {
      const stream = fs.createReadStream(jsonPath).pipe(JSONStream.parse('results.*'));
      stream
        .on('data', async result => {
          const docId = getDocId(result, _);
          if (!docId) {
            return console.warn(
              `Cannot find id by 'getDocId', following doc will be skipped: ${JSON.stringify(
                result
              )}`
            );
          }
          const doc = transformer(result, _);
          doc.id = docId;

          promises.push(this._upsertOpenFdaDoc(dbCon, collection, doc));

          if (promises.length >= 200) {
            stream.pause();
            await Promise.all(promises);
            promises = [];
            stream.resume();
          }
        })
        .on('error', e => console.log(`Error while parsing json file ${jsonPath}. ${e.stack}`))
        .on('end', () => {
          resolve(Promise.all(promises));
        });
    });
  }

  _upsertOpenFdaDoc(dbCon, collection, doc) {
    return dbCon.collection(collection).findOneAndReplace({ id: doc.id }, doc, { upsert: true });
  }
}

module.exports = PumpRawResourceOpenFda;
