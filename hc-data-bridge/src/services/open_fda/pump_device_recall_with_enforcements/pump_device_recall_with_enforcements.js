const _ = require('lodash');
const JSONStream = require('JSONStream');
const Promise = require('bluebird');
const fs = require('fs-extra');
const { setUpdateAtIfRecordChanged } = require('../../util/mongo');

const PumpRawResourceOpenFda = require('../pump_raw_resources/open_fda_pump_raw_resources');

class PumpDeviceRecallsWithEnforcements extends PumpRawResourceOpenFda {
  constructor(settings) {
    settings.resourcePath = 'device.recall';
    settings.getDocId = new Function('doc, _', `return doc.resEventNumber`);
    settings.transformer = 'pumpDeviceRecallWithEnforcements';
    super(settings);
  }

  pump() {
    const recallPumpSettings = this.settings.pumpParams[0];
    const { mongoUrl, destCollectionName, zipDestinationDir, jsonDestinationDir } = recallPumpSettings;

    // download and pump recalls calling super.pump()
    return super
      .pump()
      .then(() => this._createIndexes(this.connections[mongoUrl], destCollectionName))
      .then(() => {
        // download enforcements
        const enforcementsFileFilter = () => true;
        const enforcementPartitions = this.downloadFilesInfo.device.enforcement.partitions;
        const fileInfos = this._getFileInfos(enforcementPartitions, enforcementsFileFilter, zipDestinationDir);

        return this._downloadUsingWget(fileInfos);
      })
      .then(zipPaths => {
        const getDocId = doc => doc.recall_number;

        return Promise.mapSeries(zipPaths, zipPath => {
          console.log(`Unzipping file ${zipPath}`);
          return this._extractJsonFilesFromZip(zipPath, zipDestinationDir, jsonDestinationDir).then(unzippedFiles =>
            Promise.mapSeries(unzippedFiles, unzippedFile => {
              console.log(`Linking enforcements to recalls, file ${unzippedFile}`);
              return this._linkEnforcement(unzippedFile, this.connections[mongoUrl], destCollectionName, getDocId).then(
                () => {
                  fs.unlinkSync(unzippedFile);
                  console.log(`Deleted ${unzippedFile}`);
                }
              );
            })
          );
        });
      });
  }

  _createIndexes(dbCon, destCollectionName) {
    return dbCon.collection(destCollectionName).createIndex({ resEventNumber: 1 });
  }

  _linkEnforcement(jsonPath, dbCon, collection, getDocId) {
    let promises = [];
    return new Promise(resolve => {
      const stream = fs.createReadStream(jsonPath).pipe(JSONStream.parse('results.*'));
      stream
        .on('data', async result => {
          const docId = getDocId(result, _);
          if (!docId) {
            return console.warn(
              `Cannot find id by 'getDocId', following doc will be skipped: ${JSON.stringify(result)}`
            );
          }
          const doc = {
            ...result, // for now just copy raw json into doc (there might be transformations)
            _enforcementId: docId,
            rawDataEnforcement: result,
          };
          promises.push(this._updateRecallWithEnforcement(dbCon, collection, doc));

          if (promises.length >= 100) {
            stream.pause();
            await Promise.all(promises);
            promises = [];
            stream.resume();
          }
        })
        .on('end', () => {
          resolve(Promise.all(promises));
        });
    });
  }

  _updateRecallWithEnforcement(dbCon, collectionName, enforcement) {
    const eventId = enforcement.event_id;
    const collection = dbCon.collection(collectionName);
    return collection.findOne({ resEventNumber: eventId }).then(recall => {
      if (!recall) {
        return console.log(`Unable to link enforcement.event_id '${eventId}' to any of recall.resEventNumber`);
      }
      const fieldsToAdd = {
        rawDataEnforcement: enforcement,
        ...enforcement,
      };
      return setUpdateAtIfRecordChanged(collection, 'updateOne', { _id: recall._id }, { $set: fieldsToAdd });
    });
  }
}

module.exports = PumpDeviceRecallsWithEnforcements;
