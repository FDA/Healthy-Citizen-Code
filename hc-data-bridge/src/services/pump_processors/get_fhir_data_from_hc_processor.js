const datapumps = require('datapumps');

datapumps.Buffer.defaultBufferSize(10000);
const _ = require('lodash');
const moment = require('moment');

const { Group } = datapumps;
const { MongodbMixin } = datapumps.mixin;
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectID;
const helper = require('./../../lib/helper');
const SettingsProvider = require('./../settings_provider');

const settingsProvider = new SettingsProvider();

/**
 * Gets medical devices, medications, guid data of users with pii.shareDeidentifiedDataWithResearchers = true in FHIR fromat.
 *
 * Algorithm by steps:
 * 1) Get pii with shareDeidentifiedDataWithResearchers = true
 * 2) Get 'user' object by 'piiId' field. Get field 'phiId' from 'user' object
 * 3) Get 'phi' object by 'phiId' field
 * 4) Extract Patient, Devices and MedicationRequest resources
 */
class GetFhirDataFromHcPumpProcessor extends Group {
  /**
   * Builds chain of pumps.
   * @param inputSettings specifies hcUrl and researchUrl mongodb urls like 'mongodb://localhost:27017/hc-stage-test'
   */
  constructor (inputSettings) {
    super();
    this.inputSettings = inputSettings;
    this.etlTypeSettings = settingsProvider.getSettings('hcToFhir', inputSettings.requiredFields);
    this.result = [];
    this.addPumps();
    this.mandatoryElements = ['id', 'resourceType']; // mandatory elements for _elements param
    this.dbCon = null;
  }

  /**
   * Checks whether constructed pump processor is valid
   * @returns {Promise.<T>} promise with errors
   */
  checkInitialErrors () {
    const { hcUrl } = this.inputSettings;
    return Promise.all([
      this.checkConnection(hcUrl),
    ])
      .then(connections => Promise.resolve())
      .catch((url) => {
        throw new Error(`Cannot connect to: ${url}`);
      });
  }

  checkConnection (url) {
    const pumpProcessor = this;
    return new Promise((resolve, reject) => {
      MongoClient.connect(url, (err, db) => {
        if (err) {
          reject(url);
          return;
        }
        pumpProcessor.dbCon = db;
        resolve();
      });
    });
  }

  addPumps () {
    const piisSearchCondition = { 'demographics.shareDeidentifiedDataWithResearchers': true };
    if (this.inputSettings.guid) {
      piisSearchCondition['demographics.guid'] = this.inputSettings.guid;
    }
    const { hcUrl } = this.inputSettings;
    this.addPump('HC-piis')
      .mixin(MongodbMixin(hcUrl))
      .useCollection('piis')
      .from(this.pump('HC-piis').find(piisSearchCondition))
      .process(pii => this.pump('HC-piis').buffer().writeAsync(pii));
    this.addPump('HC-users')
      .mixin(MongodbMixin(hcUrl))
      .useCollection('users')
      .from(this.pump('HC-piis').buffer())
      .process(pii => this.pump('HC-users')
        .find({ piiId: pii._id.toString() })
        .toArray()
        .then((users) => {
          if (!_.isEmpty(users)) {
            this.pump('HC-users').buffer().writeAsync({
              pii,
              user: users[0],
            });
          }
        }));
    this.addPump('HC-phis')
      .mixin(MongodbMixin(hcUrl))
      .useCollection('phis')
      .from(this.pump('HC-users').buffer())
      .process(piiWithUser => this.pump('HC-phis')
        .find({ _id: new ObjectId(piiWithUser.user.phiId) })
        .toArray()
        .then((phis) => {
          if (!_.isEmpty(phis)) {
            this.pump('HC-phis').buffer().writeAsync(_.merge(piiWithUser, { phi: phis[0] }));
          }
        }));
    this.addPump('HC-products')
      .mixin(MongodbMixin(hcUrl))
      .from(this.pump('HC-phis').buffer())
      .process((hcData) => {
        const myDevices = _.get(hcData, 'phi.myDevices');
        const insertKeyInDevicePromises = [];
        _.forEach(myDevices, (device) => {
          insertKeyInDevicePromises.push(this.insertDeviceProductIdByKey(device));
        });
        const myMedications = _.get(hcData, 'phi.myMedications');
        const insertKeyInMedicationPromises = [];
        _.forEach(myMedications, (medication) => {
          insertKeyInMedicationPromises.push(this.insertMedicationProductIdByKey(medication));
        });
        return Promise.all([
          Promise.all(insertKeyInDevicePromises),
          Promise.all(insertKeyInMedicationPromises),
        ])
          .then(_ => this.pump('HC-products').buffer().writeAsync(hcData));
      });

    const pumpProcessor = this;
    this.addPump('fhirTransform')
      .from(this.pump('HC-products').buffer())
      .process(hcData => new Promise((resolve) => {
        const { user, pii, phi } = hcData;
        // inject guid to phi for inserting Patient reference
        phi.guid = _.get(pii, 'demographics.[0].guid', null);
        let newData = [];
        _.forEach(pumpProcessor.inputSettings.requiredFields, (requiredField) => {
          let resourceGroups;
          // TODO: add mapping
          if (requiredField === 'adverse_event' || requiredField === 'device' || requiredField === 'medication_request' || requiredField === 'recall') {
            resourceGroups = { phis: [phi] };
          } else if (requiredField === 'patient') {
            resourceGroups = { piis: [pii] };
          }
          const etlTypeSetting = pumpProcessor.etlTypeSettings[requiredField];
          const { config } = etlTypeSetting;
          const transformationService = etlTypeSetting.transform;
          const entries = pumpProcessor.transformData(resourceGroups, config.transform, transformationService);
          newData = newData.concat(entries);
        });

        pumpProcessor.result = pumpProcessor.result.concat(newData);
        resolve(newData);
      }));
  }

  insertDeviceProductIdByKey (device) {
    const productId = _.get(device, 'productId');
    if (!productId) {
      return false;
    }
    return this.dbCon.collection('productsdevices')
      .find({ _id: productId })
      .toArray()
      .then((productDevices) => {
        if (!_.isEmpty(productDevices)) {
          _.set(device, 'key', productDevices[0].key);
          return true;
        }
        return false;
      });
  }

  insertMedicationProductIdByKey (medication) {
    const productId = _.get(medication, 'productId');
    if (!productId) {
      return false;
    }
    return this.dbCon.collection('productsmedications')
      .find({ _id: productId })
      .toArray()
      .then((productDevices) => {
        if (!_.isEmpty(productDevices)) {
          _.set(medication, 'key', productDevices[0].key);
          return true;
        }
        return false;
      });
  }

  // Example of transaction bundle: https://www.hl7.org/fhir/bundle-transaction.json.html
  transformData (resourceGroups, transform, transformationService) {
    const result = [];
    _.forOwn(resourceGroups, (resourceGroup) => {
      resourceGroup.forEach((resourceObject) => {
        let preparedResources;
        // Resource object can be pretransformed to produce multiple objects
        if (transform.pretransform) {
          const transformations = transform.pretransform.transform;
          preparedResources = _.reduce(transformations, (dataToTransform, transformation) => {
            const transformFunc = transformationService[transformation];
            if (!_.isFunction(transformFunc)) {
              throw Error(`Error occurred during transform stage. Cannot find ${transformation} func in pretransform.`);
            }
            return transformationService[transformation](dataToTransform);
          }, resourceObject);
        } else {
          preparedResources = resourceObject;
        }
        _.forEach(_.castArray(preparedResources), (preparedResource) => {
          const resultObject = {};
          // Build resultObject
          this.transformResource(preparedResource, transform, transformationService, resultObject);
          if (!_.isEmpty(resultObject)) {
            const entry = this.prepareEntry(preparedResource, resultObject, transform.request, false);
            result.push(entry);
          }
        });
      });
    });
    return result;
  }

  prepareEntry (resourceObject, resultObject, request, isInsertRequest) {
    const entry = {};
    // extract mongo db id
    const hcObjectId = resourceObject._id;
    // We assume that our mongo db ObjectId is not existing on FHIR server
    resultObject.id = hcObjectId;
    entry.fullUrl = hcObjectId;
    const preparedRequest = helper.replaceParams(request, { resourceId: hcObjectId });
    resultObject.resourceType = preparedRequest.url.match(new RegExp('\\w+'))[0];
    entry.resource = resultObject;
    // enter request to send resource to FHIR server
    if (isInsertRequest) {
      entry.request = preparedRequest;
    }
    return entry;
  }

  /**
   * Function for traversing resourceObject, performing transformations and storing result in result object.
   * Goes deeper into transformConfig until 'path' field is found. Gets resourceObject field with 'path'.
   * Performs transformations defined in 'transform' field.
   * Writes transformed data into result object in extractPath.
   * @param resourceObject
   * @param transformConfig config describing which transformations will be performed
   * @param transformationService service where transformation functions are defined
   * @param result object which save all transformations
   * @param extractPath path to where result will be saved
   */
  transformResource (resourceObject, transformConfig, transformationService, result, extractPath) {
    extractPath = extractPath || [];
    const curValue = _.get(transformConfig, extractPath, transformConfig);
    const keys = Object.keys(curValue);
    const isEndKey = _.includes(keys, 'path');
    if (isEndKey) {
      const transformations = curValue.transform;
      const selectPath = curValue.path;
      result = _.merge(result, this.transformResourceField(resourceObject, selectPath, extractPath, transformations, transformationService));
    } else {
      keys.forEach((key) => {
        if (_.isObject(curValue[key])) {
          const newExtractPath = extractPath.slice();
          newExtractPath.push(key);
          this.transformResource(resourceObject, transformConfig, transformationService, result, newExtractPath);
        }
      });
    }
  }

  /**
   *
   * @param resourceObject
   * @param selectPath path by which data will be taken from resourceObject
   * @param extractPath path by which data will be written to result
   * @param transformations names of functions defined in transformationService
   * @param transformationService service where transformation functions are defined
   * @returns object with transformed data written in extractPath
   */
  transformResourceField (resourceObject, selectPath, extractPath, transformations, transformationService) {
    const resource = resourceObject;
    if (!resource) {
      console.error('Invalid resource object passed. Must have resource field.');
      return null;
    }
    let dataToTransform;
    const indexOfDot = selectPath.indexOf('.');
    if (indexOfDot === -1) {
      dataToTransform = resourceObject;
    } else {
      const resourcePath = selectPath.substring(indexOfDot + 1);
      dataToTransform = _.get(resource, resourcePath, null);
    }
    if (!transformations) {
      return dataToTransform;
    }
    const value = _.reduce(transformations, (dataToTransform, transformation) => {
      const transformFunc = transformationService[transformation];
      if (!_.isFunction(transformFunc)) {
        throw Error(`Error occurred during processing path "${extractPath}". Function "${transformation}" not found in service ${transformationService}`);
      }
      return transformationService[transformation](dataToTransform);
    }, dataToTransform);
    return _.set({}, extractPath, value);
  }

  wrapFhirResponse (entries) {
    const transaction = {};
    transaction.resourceType = 'Bundle';
    // TODO: think about ids and sync between servers
    transaction.id = helper.urnUuid();
    // TODO: get lastUpdated from HC
    _.set(transaction, 'meta.lastUpdated', moment().utc().format());
    transaction.type = 'searchset';
    transaction.total = entries.length;
    transaction.entry = entries;
    return transaction;
  }

  processSettings () {
    console.log(`Started processing input settings: ${JSON.stringify(this.inputSettings)}`);
    const pumpProcessor = this;
    return pumpProcessor
      .logErrorsToConsole()
      .start()
      .whenFinished()
      .then(() => {
        if (!pumpProcessor.errorBuffer().isEmpty()) {
          console.error(`Errors: ${JSON.stringify(pumpProcessor.errorBuffer().getContent())}`);
          pumpProcessor.isSuccessful = false;
        } else {
          const fhirResponse = pumpProcessor.wrapFhirResponse(pumpProcessor.result);
          const result = pumpProcessor.processElements(fhirResponse);
          pumpProcessor.result = result;
          console.log(`Received data from HC (${pumpProcessor.inputSettings.hcUrl}) and prepared FHIR response. Input settings: ${JSON.stringify(pumpProcessor.inputSettings)}`);
          pumpProcessor.isSuccessful = true;
        }
      })
      .then(() => pumpProcessor.result)
      .catch((err) => {
        console.error(`Pump failed with error: ${err}`);
        pumpProcessor.isSuccessful = false;
      });
  }

  // Elements spec: https://www.hl7.org/fhir/search.html#elements
  processElements (fhirResponse) {
    if (_.isEmpty(this.inputSettings.elements)) {
      return fhirResponse;
    }

    const elements = _.uniq(this.mandatoryElements.concat(this.inputSettings.elements));
    const result = _.cloneDeep(fhirResponse);
    _.forEach(result.entry, (entry) => {
      // TODO: it should be determined by base resource in general
      if (entry.resource.resourceType === 'Patient') {
        for (const key in entry.resource) {
          if (!elements.includes(key)) {
            delete entry.resource[key];
          }
        }
      }
    });
    return result;
  }
}

module.exports = GetFhirDataFromHcPumpProcessor;
