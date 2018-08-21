const datapump = require('datapumps');
const _ = require('lodash');
const helper = require('./../../lib/helper');
const moment = require('moment');
const SettingsProvider = require('./../settings_provider');

const settingsProvider = new SettingsProvider();

// TODO: distinguish and beautify logs
class HcToFhirPumpProcessor {
  constructor (inputSettings, bufferSize) {
    this.inputSettings = inputSettings;
    this.etlTypeSettings = settingsProvider.getSettings(inputSettings.type, inputSettings.requiredFields);
    this.createPumpWithBuffer(bufferSize || 10000);
    this.setProcessForPump();
  }

  createPumpWithBuffer (bufferSize) {
    const data_pump = new datapump.Pump();
    this.pump = data_pump
      .mixin(datapump.mixin.RestMixin)
      .from(data_pump.createBuffer({ size: bufferSize }));
  }

  /**
   * Checks whether constructed pump processor is valid
   * @returns {Promise.<T>} promise with errors
   */
  checkInitialErrors () {
    return Promise.resolve();
  }

  processSettings () {
    // Extract stage
    console.log(`Started processing input settings: ${JSON.stringify(this.inputSettings)}`);
    const globalPromises = [];
    _.forOwn(this.etlTypeSettings, (setting, settingName) => {
      const promises = this.createExtractPromises(setting.config.extract);
      globalPromises.push(this.extractToDataPump(promises, settingName));
    });
    const pumpProcessor = this;
    return Promise.all(globalPromises)
      .then(() => {
        console.log(`Extracting data is finished.`);
        pumpProcessor.pump.from().seal();

        return pumpProcessor.pump
          .logErrorsToConsole()
          .start()
          .whenFinished()
          .then(() => {
            if (!pumpProcessor.pump.errorBuffer().isEmpty()) {
              console.error(`Transfer finished with errors: ${JSON.stringify(pumpProcessor.pump.errorBuffer().getContent())}`);
              pumpProcessor.isSuccessful = false;
            } else {
              console.log(`Finished processing input settings: ${JSON.stringify(pumpProcessor.inputSettings)}`);
              pumpProcessor.isSuccessful = true;
            }
          })
          .catch((err) => {
            console.error(`Pump failed with error: ${err}`);
            pumpProcessor.isSuccessful = false;
          });
      });
  }

  // Form promises to get extracted data to be transformed
  // Here we can use fhir.js instead of straight building url
  // However in this case need to think about ETL format for other protocols to make strategy work
  createExtractPromises (extractConfig) {
    const promises = [];
    extractConfig.forEach((requestParams) => {
      const preparedRequestParams = helper.replaceParams(requestParams, {
        piiId: this.inputSettings.piiId,
        phiId: this.inputSettings.phiId,
        jwtToken: this.inputSettings.jwtToken,
      });
      const base = `${this.inputSettings.srcServer}${preparedRequestParams.path}`;
      const url = helper.buildUrl(base, preparedRequestParams.params);
      const timeout = 10000;
      promises.push(this.pump.get(
        url,
        {
          timeout,
          headers: preparedRequestParams.headers,
        }
      )
        .then(response => ({
          response,
          pathToExtract: requestParams.pathToExtract,
        }))
        .catch((err) => {
          // console.error(`Could not access url ${url} in timeout ${timeout}: ${err}`);
          throw new Error(`Could not access url ${url} in timeout ${timeout}: ${err}`);
        }));
    });
    return promises;
  }

  extractToDataPump (promises, settingName) {
    // Write data to data pump
    return Promise.all(promises)
      .then((responses) => {
        let data = {};
        responses.forEach((promiseData) => {
          const { statusCode } = promiseData.response;
          const { path } = promiseData.response.req;
          if (statusCode !== 200) {
            throw new Error(`Error occurred on extract stage during parsing "${settingName}":\n` +
              `Request with path ${path} returned wrong status code - ${statusCode}\n` +
              `Response message: ${promiseData.response.result.message}`);
          }
          if (!promiseData.response.result.success) {
            throw new Error(`Error occurred on extract stage during parsing "${settingName}":
           request with path ${path} returned "success": false. Data: ${promiseData.response.result.data}`);
          }
          if (promiseData.pathToExtract) {
            _.set(data, promiseData.pathToExtract, _.castArray(promiseData.response.result.data));
          } else {
            data = _.merge(data, promiseData.response.result.data);
          }
        });
        // Write to pump the data which is taken from all requests from extract stage
        // Also we need to write settingName to know how to transform data
        this.pump.from().write({ settingName, data });
        console.log(`Extracted data for "${settingName}".`);
        return true;
      })
      .catch((err) => {
        console.error(err);
        return false;
      });
  }

  /**
   * Defines transform and transform stages (how to handle data from extract stage)
   */
  setProcessForPump () {
    const pumpProcessor = this;
    pumpProcessor.pump.process((extracted) => {
      // Config and transformations for specific part(one of piis, phis_deaths... etc)
      const { settingName } = extracted;
      const etlTypeSetting = pumpProcessor.etlTypeSettings[settingName];
      const { config } = etlTypeSetting;
      const transformationService = etlTypeSetting.transform;

      return new Promise((resolve) => {
        // Transform data here
        const preparedTransform = helper.replaceParams(config.transform, pumpProcessor.inputSettings);
        const entries = pumpProcessor.transformData(
          extracted.data,
          preparedTransform,
          transformationService,
          pumpProcessor.inputSettings
        );
        const transactionBundle = pumpProcessor.wrapFhirEntries(entries);
        console.log(`Transformed data for "${settingName}".`);
        resolve(transactionBundle);
      })
        .catch((err) => {
          console.error(`Error occurred on transform stage for "${settingName}": ${err}`);
          return false;
        })
        // Then transform transformed data
        .then(transactionBundle => pumpProcessor.load(config.load, transactionBundle, settingName))
        .catch((err) => {
          console.error(`Error occurred on load stage for "${settingName}": ${err}`);
          return false;
        });
    });
  }

  wrapFhirEntries (entries) {
    const transaction = {};
    transaction.resourceType = 'Bundle';
    // TODO: think about ids and sync between servers
    transaction.id = helper.urnUuid();
    // TODO: get lastUpdated from HC
    _.set(transaction, 'meta.lastUpdated', moment().utc().format());
    transaction.type = 'transaction';
    transaction.entry = entries;
    return transaction;
  }

  // Example of transaction bundle: https://www.hl7.org/fhir/bundle-transaction.json.html
  transformData (resourceGroups, transform, transformationService, inputSettings) {
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
            return transformationService[transformation](dataToTransform, inputSettings);
          }, resourceObject);
        } else {
          preparedResources = resourceObject;
        }
        _.forEach(_.castArray(preparedResources), (preparedResource) => {
          const resultObject = {};
          // Build resultObject
          this.transformResource(preparedResource, transform, transformationService, resultObject);
          if (!_.isEmpty(resultObject)) {
            const entry = this.prepareEntry(resourceObject, resultObject, transform.request);
            result.push(entry);
          }
        });
      });
    });
    return result;
  }

  prepareEntry (resourceObject, resultObject, request) {
    const entry = {};
    // extract mongo db id
    const hcObjectId = resourceObject._id;
    // We assume that our mongo db ObjectId is not existing on FHIR server
    resultObject.id = hcObjectId;
    entry.fullUrl = hcObjectId;
    // enter request to send resource to FHIR server
    if (request) {
      const preparedRequest = helper.replaceParams(request, { resourceId: hcObjectId });
      resultObject.resourceType = preparedRequest.url.match(new RegExp('\\w+'))[0];
      entry.request = preparedRequest;
    }
    entry.resource = resultObject;
    return entry;
  }

  /**
   * Function for traversing resourceObject, performing transformations and storing result in result object.
   * Goes deeper into transformConfig until 'path' field is found. Gets resourceObject field with 'path'.
   * Perform transformations defined in 'transform' field.
   * Writes transformed data in result object in extractPath.
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
      result = _.merge(
        result,
        this.transformResourceField(resourceObject, selectPath, extractPath, transformations, transformationService)
      );
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

  /**
   * Load stage
   * @param loadConfig
   * @param transformedData
   * @param settingName
   * @returns {Promise.<*>}
   */
  load (loadConfig, transformedData, settingName) {
    const loadPromises = [];
    // Iterate over each request in transform config
    // Maybe this is redundant and we will always have one request
    loadConfig.forEach((requestParams) => {
      loadPromises.push(this.loadData(requestParams, transformedData, settingName));
    });
    return Promise.all(loadPromises);
  }

  // Loads data on destination server.
  loadData (requestParams, data, settingName) {
    const methodName = requestParams.method.toLowerCase();
    const base = `${this.inputSettings.destServer}${requestParams.path}`;
    // Remove placeholders with values provided from input
    const url = helper.buildUrl(base, requestParams.params);
    const preparedData = JSON.stringify(data);
    return this.pump[methodName](url, { data: preparedData, headers: requestParams.headers })
      .then((response) => {
        if (response.statusCode !== 200) {
          console.error(`Error occurred during loading data for "${settingName}".\n` +
            `Destination server respond with status code: ${response.statusCode}.\n` +
            `Response: ${JSON.stringify(response.result)}.\n` +
            `Request: ${methodName} ${base}\n` +
            `Request body: ${preparedData}.\n` +
            `Request headers: ${JSON.stringify(requestParams.headers)}.`);
          return false;
        }
        console.log(`Successfully loaded data for "${settingName}".\n` +
            `Response: ${response.result}`);
        return true;
      })
      .catch((err) => {
        console.error(`Error occurred on load stage for "${settingName}". ${err}`);
        return false;
      });
  }
}

module.exports = HcToFhirPumpProcessor;
