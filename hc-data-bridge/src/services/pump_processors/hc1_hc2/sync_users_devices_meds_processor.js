const datapumps = require('datapumps');

datapumps.Buffer.defaultBufferSize(10000);
const _ = require('lodash');

const { Group } = datapumps;
const { MongodbMixin } = datapumps.mixin;
const ObjectId = require('mongodb').ObjectID;
// const logger = require('log4js').getLogger('SyncUsersDevicesMedsProcessor');
const uuidv4 = require('uuid/v4');
const { mongoConnect } = require('../../util/mongo');

/**
 * Syncs medical devices, medications for users by guid
 *
 * Algorithm by steps:
 * 0) Input data is HC1-pii, HC1-phi. Get HC1-user (if needed)
 * 1) Find matching HC2-user, HC2-pii, HC2-phi by HC1-pii.demographics.guid.
 * 2) Update HC2-pii with HC1-pii by HC2-pii._id
 * 3) Update HC2-phi with HC1-phi by HC2-phi._id (medications and devices)
 * 4) Update HC2-user with HC1-user by HC2-user._id
 */

class SyncUsersDevicesMedsProcessor extends Group {
  constructor(inputSettings) {
    super();
    this.inputSettings = inputSettings;
    this.addPumps();
    this.dbCon = null;
  }

  /**
   * Checks whether constructed pump processor is valid
   * @returns {Promise.<T>} promise with errors
   */
  getConnections() {
    const processor = this;
    const { destHcUrl } = processor.inputSettings;
    return Promise.all([this.getConnection(destHcUrl)])
      .catch(url => {
        throw new Error(`Cannot connect to: ${url}`);
      });
  }

  getConnection(url) {
    return mongoConnect(url)
      .then(dbConnection => {
        this.dbCon = dbConnection;
        console.log(`Get connection url: ${url} `);
        return dbConnection;
      })
      .catch(e => {
        throw new Error(url);
      });
  }

  addPumps() {
    const destHcUrl = this.inputSettings.destHcUrl;
    const hcUsersData = this.inputSettings.hcUsersData;
    const pumpProcessor = this;

    // stage 1
    this.addPump('HC2-piis')
      .mixin(MongodbMixin(destHcUrl))
      .useCollection('piis')
      .from(hcUsersData)
      .process(HC1_data => {
        const combinedData = {
          HC1_pii: HC1_data.piis,
          HC1_phi: HC1_data.phis,
        };
        // const deidentifiedFlag = _.get(combinedData, "HC1_pii.demographics[0].shareDeidentifiedDataWithResearchers");
        // if (!deidentifiedFlag) {
        //   return;
        // }
        const guid = _.get(combinedData, 'HC1_pii.demographics[0].guid');
        if (guid) {
          return this.pump('HC2-piis')
            .find({ 'demographics.guid': guid })
            .toArray()
            .then(HC2_piis => {
              if (!_.isEmpty(HC2_piis)) {
                combinedData.HC2_pii = HC2_piis[0];
              }
              this.pump('HC2-piis')
                .buffer()
                .writeAsync(combinedData);
            });
        }
        console.warn(`There is no guid in HC1.pii with id ${_.get(combinedData, 'HC1_pii._id')}`);
        return Promise.resolve();
      });

    this.addPump('HC2-users')
      .mixin(MongodbMixin(destHcUrl))
      .useCollection('users')
      .from(this.pump('HC2-piis').buffer())
      .process(combinedData => {
        const piiId = _.get(combinedData, 'HC2_pii._id');
        if (piiId) {
          return this.pump('HC2-users')
            .find({ piiId: piiId.toString() })
            .toArray()
            .then(HC2_users => {
              if (!_.isEmpty(HC2_users)) {
                combinedData.HC2_user = HC2_users[0];
              }
              this.pump('HC2-users')
                .buffer()
                .writeAsync(combinedData);
            });
        }
        return this.pump('HC2-users')
          .buffer()
          .writeAsync(combinedData);
      });
    this.addPump('HC2-phis')
      .mixin(MongodbMixin(destHcUrl))
      .useCollection('phis')
      .from(this.pump('HC2-users').buffer())
      .process(combinedData => {
        const phiId = _.get(combinedData, 'HC2_user.phiId');
        if (phiId) {
          return this.pump('HC2-phis')
            .find({ _id: new ObjectId(phiId) })
            .toArray()
            .then(HC2_phis => {
              if (!_.isEmpty(HC2_phis)) {
                combinedData.HC2_phi = HC2_phis[0];
              }
              this.pump('HC2-phis')
                .buffer()
                .writeAsync(combinedData);
            });
        }
        return this.pump('HC2-phis')
          .buffer()
          .writeAsync(combinedData);
      });

    // prepare data
    this.addPump('prepare')
      .from(this.pump('HC2-phis').buffer())
      .process(combinedData => {
        const { HC2_user, HC1_pii, HC2_pii, HC1_phi, HC2_phi } = combinedData;
        const piiIdToUpdate = _.get(HC2_pii, '_id', null);
        const phiIdToUpdate = _.get(HC2_phi, '_id', null);
        const userIdToUpdate = _.get(HC2_user, '_id', null);
        const preparedData = {
          piiIdToUpdate,
          phiIdToUpdate,
          userIdToUpdate,
          userToUpdateWith: this.getUserToUpdateWith(HC2_user),
          piiToUpdateWith: this.getPiiToUpdateWith(HC2_pii, HC1_pii),
        };
        return new Promise(resolve => {
          resolve(pumpProcessor.getPhiToUpdateWith(HC2_phi, HC1_phi));
        }).then(phiToUpdateWith => {
          preparedData.phiToUpdateWith = phiToUpdateWith;
          return this.pump('prepare')
            .buffer()
            .writeAsync(preparedData);
        });
      });

    // stage 3
    this.addPump('HC2-pii-update')
      .mixin(MongodbMixin(destHcUrl))
      .useCollection('piis')
      .from(this.pump('prepare').buffer())
      .process(preparedData => {
        const { piiIdToUpdate, piiToUpdateWith } = preparedData;
        if (!piiIdToUpdate) {
          return this.pump('HC2-pii-update')
            .insert(piiToUpdateWith)
            .then(result => {
              const insertedId = result.insertedIds[0];
              preparedData.piiIdToUpdate = insertedId;
              console.log(`Inserted new pii with id: ${insertedId}`);
              return this.pump('HC2-pii-update')
                .buffer()
                .writeAsync(preparedData);
            });
        }
        return this.pump('HC2-pii-update')
          .update({ _id: piiIdToUpdate }, piiToUpdateWith)
          .then(result => {
            const error = _.get(result, 'result.writeError');
            if (error) {
              console.error(
                `Error occurred during updating pii: ${JSON.stringify(error)}. piiIdToUpdate: ${JSON.stringify(
                  piiIdToUpdate
                )}. piiToUpdateWith: ${JSON.stringify(piiToUpdateWith)}`
              );
            }
            console.log(`Modified pii with id ${piiIdToUpdate}`);
            return this.pump('HC2-pii-update')
              .buffer()
              .writeAsync(preparedData);
          });
      });
    // stage 4
    this.addPump('HC2-phi-update')
      .mixin(MongodbMixin(destHcUrl))
      .useCollection('phis')
      .from(this.pump('HC2-pii-update').buffer())
      .process(preparedData => {
        const { phiIdToUpdate, phiToUpdateWith } = preparedData;
        if (!phiIdToUpdate) {
          return this.pump('HC2-phi-update')
            .insert(phiToUpdateWith)
            .then(result => {
              const insertedId = result.insertedIds[0];
              preparedData.phiIdToUpdate = insertedId;
              console.log(`Inserted new phi with id: ${insertedId}`);
              return this.pump('HC2-phi-update')
                .buffer()
                .writeAsync(preparedData);
            });
        }
        return this.pump('HC2-phi-update')
          .update({ _id: phiIdToUpdate }, phiToUpdateWith)
          .then(result => {
            const error = _.get(result, 'result.writeError');
            if (error) {
              console.error(
                `Error occurred during updating phi: ${JSON.stringify(error)}. phiIdToUpdate: ${JSON.stringify(
                  phiIdToUpdate
                )}. phiToUpdateWith: ${JSON.stringify(phiToUpdateWith)}`
              );
            }
            console.log(`Modified phi with id ${phiIdToUpdate}`);
            return this.pump('HC2-phi-update')
              .buffer()
              .writeAsync(preparedData);
          });
      });
    // stage 5
    this.addPump('HC2-user-update')
      .mixin(MongodbMixin(destHcUrl))
      .useCollection('users')
      .from(this.pump('HC2-phi-update').buffer())
      .process(preparedData => {
        const { userToUpdateWith, userIdToUpdate, piiIdToUpdate, phiIdToUpdate } = preparedData;
        // insert piiId and phiId that was inserted in HC2
        userToUpdateWith.piiId = piiIdToUpdate.toString();
        userToUpdateWith.phiId = phiIdToUpdate.toString();
        if (!userIdToUpdate) {
          return this.pump('HC2-user-update')
            .insert(userToUpdateWith)
            .then(result => {
              const insertedId = result.insertedIds[0];
              preparedData.userIdToUpdate = insertedId;
              console.log(`Inserted new user with id: ${insertedId}`);
              return Promise.resolve(preparedData);
            });
        }
        return this.pump('HC2-user-update')
          .update({ _id: userIdToUpdate }, userToUpdateWith)
          .then(result => {
            const error = _.get(result, 'result.writeError');
            if (error) {
              console.error(
                `Error occurred during updating: ${JSON.stringify(error)}. userIdToUpdate: ${JSON.stringify(
                  userIdToUpdate
                )}. userToUpdateWith: ${JSON.stringify(userToUpdateWith)}`
              );
            }
            console.log(`Modified user with id ${userIdToUpdate}`);
            return Promise.resolve(preparedData);
          });
      });
  }

  getPiiToUpdateWith(HC2_pii, HC1_pii) {
    const piiToUpdateWith = {};
    _.set(piiToUpdateWith, 'demographics[0].guid', _.get(HC1_pii, 'demographics[0].guid'));
    _.set(
      piiToUpdateWith,
      'demographics[0].shareDeidentifiedDataWithResearchers',
      _.get(HC1_pii, 'demographics[0].shareDeidentifiedDataWithResearchers')
    );
    return piiToUpdateWith;
  }

  getPhiToUpdateWith(HC2_phi, HC1_phi) {
    const phiToUpdateWith = HC2_phi ? _.clone(HC2_phi) : this.createEmptyPhi();
    phiToUpdateWith.myDevices = HC1_phi.myDevices;
    phiToUpdateWith.myMedications = HC1_phi.myMedications;

    const insertKeyInDevicePromises = [];
    _.forEach(phiToUpdateWith.myDevices, device => {
      insertKeyInDevicePromises.push(this.insertDeviceProductIdByKey(device));
    });

    const insertKeyInMedicationPromises = [];
    _.forEach(phiToUpdateWith.myMedications, medication => {
      insertKeyInMedicationPromises.push(this.insertMedicationProductIdByKey(medication));
    });

    return Promise.all([Promise.all(insertKeyInDevicePromises), Promise.all(insertKeyInMedicationPromises)]).then(_ => {
      delete phiToUpdateWith._id;
      return phiToUpdateWith;
    });
  }

  insertDeviceProductIdByKey(device) {
    const key = _.get(device, 'key');
    if (!key) {
      _.set(device, 'productId', null);
      // delete key value (its not in model)
      delete device.key;
      return false;
    }
    return this.dbCon
      .collection('productsdevices')
      .find({ key })
      .toArray()
      .then(productDevices => {
        // delete key value (its not in model)
        delete device.key;
        if (!_.isEmpty(productDevices)) {
          _.set(device, 'productId', productDevices[0]._id);
          return true;
        }
        return false;
      });
  }

  insertMedicationProductIdByKey(medication) {
    const key = _.get(medication, 'key');
    if (!key) {
      _.set(medication, 'productId', null);
      // delete key value (its not in model)
      delete medication.key;
      return false;
    }
    return this.dbCon
      .collection('productsmedications')
      .find({ key })
      .toArray()
      .then(productMedications => {
        // delete key value (its not in model)
        delete medication.key;
        if (!_.isEmpty(productMedications)) {
          _.set(medication, 'productId', productMedications[0]._id);
          return true;
        }
        return false;
      });
  }

  getUserToUpdateWith(HC2_user) {
    const userToUpdateWith = HC2_user ? _.clone(HC2_user) : this.getEmptyUser();
    delete userToUpdateWith._id;
    return userToUpdateWith;
  }

  getEmptyUser() {
    return {
      salt: `${uuidv4()}`,
      password: `${uuidv4()}`,
      login: `${uuidv4()}@gmail.com`,
      accountProvider: [],
    };
  }

  createEmptyPii() {
    return {
      firstName: '',
      lastName: '',
      displayName: '',
      email: '',
      linkedAccounts: [],
      hospitals: [],
      demographics: [],
    };
  }

  createEmptyPhi() {
    return {
      groupings: [],
      activities: [],
      deaths: [],
      diets: [],
      encounters: [],
      enrollments: [],
      demographics: [],
      health: [],
      homeLabs: [],
      labTests: [],
      medicationAdherences: [],
      moods: [],
      myAdverseEvents: [],
      myBiologics: [],
      myDevices: [],
      myMedications: [],
      myRecalls: [],
      mySupplements: [],
      myTobaccos: [],
      myVaccines: [],
      notes: '',
      generatorBatchNumber: `hc-v3-gen-${new Date().getTime()}`,
    };
  }

  processSettings() {
    console.log(`Started synchronizing HC data to ${this.inputSettings.destHcUrl}`);
    const pumpProcessor = this;
    return pumpProcessor.getConnections().then(() =>
      pumpProcessor
        .logErrorsToConsole()
        .start()
        .whenFinished()
        .then(() => {
          let message;
          if (!pumpProcessor.errorBuffer().isEmpty()) {
            message = `Errors: ${JSON.stringify(pumpProcessor.errorBuffer().getContent())}`;
            console.error(message);
            pumpProcessor.isSuccessful = false;
          } else {
            message = `Synchronized user data to HC2(${pumpProcessor.inputSettings.destHcUrl})`;
            console.log(message);
            pumpProcessor.isSuccessful = true;
          }
          return Promise.resolve(message);
        })
        .catch(err => {
          console.error(`Pump failed with error: ${err}`);
          pumpProcessor.isSuccessful = false;
        })
    );
  }
}

module.exports = SyncUsersDevicesMedsProcessor;
