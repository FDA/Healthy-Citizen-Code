const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const unzip = require('unzip');
const JSONStream = require('JSONStream');
const Promise = require('bluebird');
const sh = require('shelljs');
const objectHash = require('object-hash');
const es = require('event-stream');
const { mongoConnect, insertOrReplaceDocByCondition } = require('../../util/mongo');
const readline = require('readline');

const transformers = require('./transformers');
const transformersContexts = require('./transformer_contexts');
const { isValidMongoDbUrl } = require('../../../lib/helper');
const { downloadUsingWget } = require('../../util/download');
const { getAxiosProxySettings, getWgetProxyParams } = require('../../util/proxy');
// eslint-disable-next-line import/order
const axios = require('axios').create(getAxiosProxySettings());

class PumpRawResourceOpenFda {
  constructor(settings) {
    this.settings = {
      downloadJsonUrl: 'https://api.fda.gov/download.json',
      defaultZipDir: path.join(__dirname, './resources', 'zip'),
      defaultJsonDir: path.join(__dirname, './resources', 'json'),
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
      const { mongoUrl, destCollectionName, resourcePath, zipDestinationDir, transformer, transformerContext } = obj;
      if (!isValidMongoDbUrl(mongoUrl)) {
        res.errors.push(`${mongoUrl} at index ${index} is not a valid mongo db url`);
      }
      if (!_.isString(destCollectionName)) {
        res.errors.push(`${destCollectionName} at index ${index} is not a valid destination collection name`);
      }
      if (!_.isString(resourcePath)) {
        res.errors.push(`${resourcePath} at index ${index} is not a valid resource path`);
      }
      if (!_.isString(zipDestinationDir)) {
        obj.zipDestinationDir = this.settings.defaultZipDir;
        obj.jsonDestinationDir = this.settings.defaultJsonDir;
      } else {
        obj.jsonDestinationDir = path.resolve(zipDestinationDir, '../json');
      }

      if (!transformer) {
        obj.transformer = transformers.def;
      } else if (_.isString(transformer)) {
        const func = transformers[transformer];
        if (func) {
          obj.transformer = func;
        } else {
          res.errors.push(`'${transformer}' must be defined in 'transformers' module.`);
        }
      } else if (!_.isFunction(transformer)) {
        res.errors.push(`'${transformer}' should be a function.`);
      }

      if (_.isString(transformerContext)) {
        // transformerContext can be 'func' or 'func(param1, param2...)'
        const indexOfFirstBracket = transformerContext.indexOf('(');
        const funcNameEnd = indexOfFirstBracket === -1 ? transformerContext.length : indexOfFirstBracket;
        const funcName = transformerContext.substring(0, funcNameEnd);
        if (!transformersContexts[funcName]) {
          res.errors.push(
            `Function '${funcName}' in transformerContext '${transformerContext}' must be defined in 'transformer_contexts' module.`
          );
        } else {
          const indexOfLastBracket = transformerContext.lastIndexOf(')');
          const funcParams = transformerContext.substring(indexOfFirstBracket + 1, indexOfLastBracket);
          obj.transformerContext = new Function(`return this.f(${funcParams})`).bind({
            f: transformersContexts[funcName],
          });
        }
      }

      if (!_.isFunction(obj.fileFilter)) {
        obj.fileFilter = () => true;
      }
      if (!_.isFunction(obj.getDocId)) {
        obj.getDocId = (doc) => objectHash.sha1(doc);
      }
    });
    return res;
  }

  async pump() {
    console.log(`Downloading openfda all available files list...`);
    this.downloadFilesInfo = await this._getDownloadFilesInfo();

    console.log(`Start downloading files`);
    console.log(this.SPLITTER);

    const wgetProxyParams = getWgetProxyParams();
    const downloadedResMetas = await Promise.map(this.settings.pumpParams, async (paramsObj) => {
      const resourceMeta = _.get(this.downloadFilesInfo, paramsObj.resourcePath, {});
      if (!resourceMeta.partitions) {
        console.log(`There is no resource for path ${paramsObj.resourcePath}`);
        return { ...paramsObj, zipPaths: null };
      }

      const { fileFilter, zipDestinationDir } = paramsObj;
      const fileInfos = this._getFileInfos(resourceMeta.partitions, fileFilter, zipDestinationDir);
      const zipPaths = await downloadUsingWget(fileInfos, false, wgetProxyParams);
      if (!paramsObj.transformerContext) {
        paramsObj.transformerContext = {};
      } else {
        paramsObj.transformerContext = await paramsObj.transformerContext();
      }
      return {
        ...paramsObj,
        zipPaths,
      };
    });
    const resMetas = downloadedResMetas.filter((resMeta) => resMeta.zipPaths);
    return Promise.mapSeries(resMetas, (resMeta) => {
      console.log(this.SPLITTER);
      console.log(`Start processing for resource '${resMeta.resourcePath}'`);
      return this._saveArchivesToMongo(resMeta).then(() => {
        console.log(`Finished processing for resource '${resMeta.resourcePath}'`);
        console.log(this.SPLITTER);
      });
    });
  }

  /**
   * For each partition files forms directory path by url
   Example: subdir 'drug/event/all_other' for url 'https://download.open.fda.gov/drug/event/all_other/drug-event-0001-of-0004.json.zip'
   */
  _getFileInfos(partitions, fileFilter, zipDestinationDir) {
    const fileInfos = partitions
      .filter((p) => fileFilter(p.file, _))
      .map((p) => {
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
    return axios
      .get(this.settings.downloadJsonUrl)
      .then((res) => {
        if (res.status === 200) {
          return res.data.results;
        }
        throw new Error(`Cannot download 'download.json' by url ${this.settings.downloadJsonUrl}`);
      })
      .catch((e) => {
        throw new Error(`Cannot download 'download.json' by url ${this.settings.downloadJsonUrl}. ${e.stack}`);
      });
  }

  _saveArchivesToMongo(resMeta) {
    const {
      mongoUrl,
      destCollectionName,
      zipPaths,
      getDocId,
      transformer,
      transformerContext,
      zipDestinationDir,
      jsonDestinationDir,
    } = resMeta;

    return new Promise((resolve, reject) => {
      if (this.connections[mongoUrl]) {
        return resolve();
      }

      mongoConnect(mongoUrl)
        .then((dbConnection) => {
          this.connections[mongoUrl] = dbConnection;
          resolve();
        })
        .catch((err) => {
          reject(`Cannot get connection to ${mongoUrl}. ${err.message}`);
        });
    })
      .then(() => this.connections[mongoUrl].collection(destCollectionName).createIndex({ id: 1 }))
      .then(() => {
        const dbCon = this.connections[mongoUrl];

        return Promise.mapSeries(zipPaths, (zipPath) => {
          console.log(`Unzipping file ${zipPath}`);
          return this._extractJsonFilesFromZip(zipPath, zipDestinationDir, jsonDestinationDir).then((unzippedFiles) =>
            Promise.mapSeries(unzippedFiles, (unzippedFile) => {
              console.log(`Saving to mongo file ${unzippedFile}`);
              return this._parseJsonAndWriteToMongo({
                jsonPath: unzippedFile,
                dbCon,
                collection: destCollectionName,
                getDocId,
                transformer,
                transformerContext,
              }).then(() => {
                fs.unlinkSync(unzippedFile);
                console.log(`\nDeleted ${unzippedFile}`);
              });
            })
          );
        });
      });
  }

  _extractJsonFilesFromZip(zipPath, zipDestinationDir, jsonDestinationDir) {
    return new Promise((resolve) => {
      // find nestedPath like 'device/enforcement'
      const nestedZipPath = zipPath.substring(zipDestinationDir.length + 1, zipPath.lastIndexOf('/'));
      const jsonNestedDir = path.resolve(jsonDestinationDir, nestedZipPath);
      fs.ensureDirSync(jsonNestedDir);

      const unzippedFiles = [];
      fs.createReadStream(zipPath)
        .pipe(unzip.Parse())
        .on('entry', (entry) => {
          const fileName = entry.path;
          const unzippedFile = path.resolve(__dirname, jsonNestedDir, fileName);
          unzippedFiles.push(unzippedFile);
          entry.pipe(fs.createWriteStream(unzippedFile));
        })
        .on('close', () => {
          resolve(unzippedFiles);
        })
        .on('error', (e) => console.log(`Error while extracting json files from zip ${zipPath}. ${e.stack}`));
    });
  }

  _parseJsonAndWriteToMongo({ jsonPath, dbCon, collection, getDocId, transformer, transformerContext }) {
    let docs = [];
    let docsCounter = 0;
    const batchSize = 50;
    const concurrency = 10;

    return new Promise((resolve) => {
      const stream = fs
        .createReadStream(jsonPath)
        .pipe(JSONStream.parse('results.*'))
        .pipe(
          es.mapSync(async (result) => {
            try {
              const docId = getDocId(result, _);
              if (!docId) {
                return console.warn(
                  `Cannot find id by 'getDocId', following doc will be skipped: ${JSON.stringify(result)}`
                );
              }
              const doc = transformer(result, transformerContext, _);
              doc.id = docId;
              docs.push(doc);

              if (docs.length >= batchSize) {
                stream.pause();
                await Promise.map(
                  docs,
                  (d) => {
                    try {
                      return insertOrReplaceDocByCondition(d, dbCon.collection(collection), { id: d.id });
                    } catch (e) {
                      console.log(`Error while handling doc ${JSON.stringify(d)}. Retrying...`);
                      return insertOrReplaceDocByCondition(d, dbCon.collection(collection), { id: d.id });
                    }
                  },
                  { concurrency }
                );

                docsCounter += docs.length;
                readline.clearLine(process.stdout, 0); // move cursor to beginning of line
                readline.cursorTo(process.stdout, 0);
                process.stdout.write(`Docs handled: ${docsCounter}`);

                docs = [];
                stream.resume();
              }
            } catch (e) {
              console.log(`Error while parsing doc:\n${JSON.stringify(result)}\n ${e.stack}`);
              console.log(`Resuming stream`);
              stream.resume();
            }
          })
        )
        .on('end', () => {
          resolve(
            Promise.map(docs, (d) => insertOrReplaceDocByCondition(d, dbCon.collection(collection), { id: d.id }), {
              concurrency,
            })
          );
        });

      // stream
      //   .on('data', async result => {
      //     try {
      //       const docId = getDocId(result, _);
      //       if (!docId) {
      //         return console.warn(
      //           `Cannot find id by 'getDocId', following doc will be skipped: ${JSON.stringify(result)}`
      //         );
      //       }
      //       const doc = transformer(result, transformerContext, _);
      //       doc.id = docId;
      //       docs.push(doc);
      //
      //       if (docs.length >= batchSize) {
      //         stream.pause();
      //         await Promise.map(
      //           docs,
      //           d => {
      //             try {
      //               return insertOrReplaceDocByCondition(d, dbCon.collection(collection), { id: d.id });
      //             } catch (e) {
      //               console.log(`Error while handling doc ${JSON.stringify(d)}. Retrying...`);
      //               return insertOrReplaceDocByCondition(d, dbCon.collection(collection), { id: d.id });
      //             }
      //           },
      //           { concurrency }
      //         );
      //
      //         docsCounter += batchSize;
      //         readline.clearLine(process.stdout, 0); // move cursor to beginning of line
      //         readline.cursorTo(process.stdout, 0);
      //         process.stdout.write(`Docs handled: ${docsCounter}`);
      //
      //         docs = [];
      //         stream.resume();
      //       }
      //     } catch (e) {
      //       console.log(`Error while parsing doc:\n${JSON.stringify(result)}\n ${e.stack}`);
      //       if (stream.isPaused) {
      //         console.log(`Resuming stopped stream`);
      //         stream.resume();
      //       }
      //     }
      //   })
      //   .on('error', e => console.log(`Stream error while parsing json file ${jsonPath}. ${e.stack}`))
      //   .on('close', () => console.log('Stream closed'))
      //   .on('end', () => {
      //     resolve(
      //       Promise.map(docs, d => insertOrReplaceDocByCondition(d, dbCon.collection(collection), { id: d.id }), {
      //         concurrency,
      //       })
      //     );
      //   });
    });
  }

  _upsertOpenFdaDoc(dbCon, collection, doc) {
    return insertOrReplaceDocByCondition(doc, dbCon.collection(collection), { id: doc.id });
  }
}

module.exports = PumpRawResourceOpenFda;
