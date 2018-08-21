const datapump = require('datapumps');
const _ = require('lodash');
const helper = require('./../../lib/helper');
const SettingsProvider = require('./../settings_provider');

const settingsProvider = new SettingsProvider();
const fetch = require('node-fetch');

// TODO: distinguish and beautify logs
class FhirToHcPumpProcessor {
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
              console.error(`Transfer finished with errors: ${pumpProcessor.pump.errorBuffer().getContent()}`);
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
      const preparedRequestParams = helper.replaceParams(requestParams, { patientId: this.inputSettings.patientId });
      const base = `${this.inputSettings.srcServer}${preparedRequestParams.path}`;
      const url = helper.buildUrl(base, preparedRequestParams.params);
      const timeout = 10000;
      promises.push(this.pump
        .get(url, { timeout })
        .catch((err) => {
          console.error(`Could not access url ${url} in timeout ${timeout}: ${err}`);
        }));
    });
    return promises;
  }

  extractToDataPump (promises, settingName) {
    // Write data to data pump
    return Promise.all(promises)
      .then((responses) => {
        let data = {};
        responses.forEach((response) => {
          const { statusCode } = response;
          const { path } = response.req;
          if (statusCode !== 200) {
            throw new Error(`Error occurred on extract stage during parsing "${settingName}":\n` +
              `Request with path ${path} returned wrong status code - ${statusCode}\n` +
              `Response message: ${response.result.message}`);
          }
          const jsonResponse = JSON.parse(response.result);
          if (!jsonResponse.entry) {
            throw new Error(`Error occurred on extract stage during parsing "${settingName}":` +
              ` request with path ${path} returned 0 entries.`);
          }
          // Decide whether pathToExtract needed
          // const pathToExtract = etlConfig.extract[index].pathToExtract;
          // Group resources here. For example we can have {"Patient": [1], "Encounter": [3]}
          // TODO: move to pretransform
          const grouped = _(jsonResponse.entry)
            .groupBy(entry => entry.resource.resourceType)
            .value();
          data = _.merge(data, grouped);
        });
        // Write to pump the data which is taken from all requests from extract stage
        // Also we need to write settingName to know how to transform data
        this.pump.from().write({ settingName, data });
        console.log(`Extracted data for "${settingName}".`);
        return true;
      })
      .catch((err) => {
        console.error(err.message);
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
        const transformedData = pumpProcessor.transformData(
          extracted.data,
          config.transform,
          transformationService,
          pumpProcessor.inputSettings
        );
        console.log(`Transformed data for "${settingName}".`);
        resolve(transformedData);
      })
        .catch((err) => {
          console.error(`Error occurred on transform stage for "${settingName}": ${err}`);
          return false;
        })
        .then((transformedData) => {
          if (!transformedData) {
            return false;
          }
          return pumpProcessor.load(config.load, transformedData, settingName);
        })
        .catch((err) => {
          console.error(`Error occurred on load stage for "${settingName}": ${err}`);
          return false;
        });
    });
  }

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
            resultObject._id = resourceObject.resource.id;
            result.push(resultObject);
          }
        });
      });
    });
    return result;
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
    const resource = resourceObject.resource;
    if (!resource) {
      console.error('Invalid resource object passed. Must has resource field.');
      return null;
    }
    if (!selectPath.startsWith(resource.resourceType)) {
      return null;
    }
    const resourcePath = selectPath.substring(selectPath.indexOf(resource.resourceType) + resource.resourceType.length + 1);
    let dataToTransform;
    if (resourcePath === '') {
      dataToTransform = resource;
    } else {
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
      return transformationService[transformation].call(transformationService, dataToTransform);
    }, dataToTransform);
    if (!value) {
      return {};
    }
    return _.set({}, extractPath, value);
  }

  /**
   * Load stage
   * @param loadConfig
   * @param transformedData
   * @returns {Promise.<*>}
   */
  load (loadConfig, transformedData, settingName) {
    // Create promise for sequential loading data
    let promise = Promise.resolve();
    // Iterate over each request in transform config
    // Maybe this is redundant and we will always have one request
    loadConfig.forEach((requestParams) => {
      transformedData.forEach((transformedObject) => {
        // HC needs to transform data by single objects
        promise = promise.then(() => this.loadData(requestParams, transformedObject, settingName));
      });
    });
    return promise;
  }

  // Loads data on destination server.
  loadData (requestParams, data, settingName) {
    const preparedRequestParams = helper.replaceParams(requestParams, _.merge(this.inputSettings, { resourceId: data.resourceId }));
    const base = `${this.inputSettings.destServer}${preparedRequestParams.path}`;
    // Remove placeholders with values provided from input
    const configUrl = helper.buildUrl(base, preparedRequestParams.params);
    return this.getUrlAndMethod(configUrl, preparedRequestParams.headers)
      .then((urlAndMethod) => {
        const methodName = urlAndMethod.method.toLowerCase();
        const loadUrl = urlAndMethod.url;
        return this.pump[methodName](
          loadUrl,
          {
            // HC requires wrapping in data field. We can create "afterTransform" array of functions to manage it.
            data: JSON.stringify({ data }),
            headers: preparedRequestParams.headers,
          }
        );
      })
      .then((response) => {
        if (response.statusCode != 200 || !response.result.success) {
          console.error(`Error occurred during loading data for "${settingName}".\n` +
            `Destination server respond with status code: ${response.statusCode}.\n` +
            `Response: ${JSON.stringify(response.result)}.\n` +
            `Request: ${methodName} ${base}\n` +
            `Request body: ${JSON.stringify({ data })}.\n` +
            `Request headers: ${JSON.stringify(preparedRequestParams.headers)}.`);
          return false;
        }
        console.log(`Successfully loaded data for "${settingName}". Requested ${base}`);
        return true;
      })
      .catch((err) => {
        console.error(`Error occurred on load stage for "${settingName}". ${err.message}`);
        return false;
      });
  }

  /**
   * Here we need to determine whether object exists and do following
   * 1) POST method for inserting new object, and cut "/id" part of url
   * 2) PUT method for updating existing object, do nothing with url
   */
  getUrlAndMethod (url, headers) {
    return fetch(url, { headers })
      .then((res) => {
        if (res.status !== 200) {
          throw Error(`Invalid status code ${res.status} during requesting ${res.url}. ` +
            `Headers: ${JSON.stringify(headers)}`);
        }
        return res.json();
      })
      .then((json) => {
        if (json.success) { // object existing
          return {
            url,
            method: 'PUT',
          };
        }
        return {
          url: url.substring(0, url.lastIndexOf('/')),
          method: 'POST',
        };
      });
  }
}

module.exports = FhirToHcPumpProcessor;
