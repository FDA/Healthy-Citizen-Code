const dotenv = require('dotenv').load({ path: '.env' });
const restify = require('restify');
const restifyPlugins = require('restify-plugins');
// const logger = require('morgan');
const log = require('log4js').getLogger('server');
const _ = require('lodash');
const pumpProcessorProvider = require('./src/services/pump_processor_provider');
const resourceNameProvider = require('./src/services/resource_name_provider');
const validateSettings = require('./src/services/settings_validator');
const fetch = require('node-fetch');

const fs = require('fs');
const path = require('path');
const multer = require('multer');

const upload = multer();
// const cpUpload = upload.fields([{ name: 'avatars', maxCount: 1 }, { name: 'avatars2', maxCount: 1 }, { name: 'asd'}]);
const { transformFilesToModel } = require('./src/services/file_to_model/file_to_model');

const server = restify.createServer({ name: process.env.APP_NAME });
server.on('uncaughtException', (req, res, route, err) => {
  log.error(`Data bridge. Uncaught exception ${err}`);
  res.json(500, { success: false, code: 'uncaughtException', message: `${err}` });
});
server.on('InternalServer', (req, res, route, err) => {
  log.error(`Data bridge. Internal server error ${err}`);
  res.json(500, { success: false, code: 'InternalServer', message: `${err}` });
});
server.use(restifyPlugins.queryParser());
server.use(restifyPlugins.bodyParser());
// For CORS
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  return next();
});

server.get(/.+\.html/, restify.plugins.serveStatic({
  directory: `${__dirname}/public`,
  default: '/widget.html',
}));

/**
 * Pumps data with settings specified in req.body
 */
function pump (req, res, next) {
  const inputSettings = req.body;
  const validatedSettings = validateSettings(inputSettings);
  if (!_.isEmpty(validatedSettings.err)) {
    res.json(400, {
      message: 'Invalid settings entered',
      success: false,
      errors: validatedSettings.err,
    });
    return next(false);
  }
  const pumpProcessor = pumpProcessorProvider.getPumpProcessor(validatedSettings);
  // need to wait response?
  pumpProcessor.checkInitialErrors()
    .then((errorMsg) => {
      if (errorMsg) {
        // code is 422 because settings are valid, but cannot be processed
        res.json(422, {
          message: errorMsg,
          success: false,
        });
        return next(false);
      }
    })
    .then(() => pumpProcessor.processSettings())
    .catch((err) => {
      res.json(500, {
        message: err,
        success: false,
      });
      return next(false);
    });
  res.json(200, {
    message: 'Settings processing is launched',
    success: true,
  });
}

/**
 * Retrieves data from HC1 for specified user with shareDeidentifiedDataWithResearchers = true and transforms it to FHIR format.
 * "_revinclude" param contains values to join Patient with.
 */
function getPatientFhirData (req, res, next) {
  const revincludeValues = req.query._revinclude;
  const resourceNames = resourceNameProvider.getFhirResourceNamesByQueryParam('_revinclude', _.castArray(revincludeValues));
  // if (_.isEmpty(resourceNames)) {
  //   res.json(400, {
  //     message: "Invalid query",
  //     success: false
  //   });
  //   return next(false);
  // }

  const requestElements = req.query._elements ? req.query._elements.split(',') : [];

  const getFhirDataFromHcSettings = {
    type: 'getFhirDataFromHc',
    hcUrl: process.env.MONGODB_URI_FOR_FHIR_SEARCH,
    requiredFields: ['patient'].concat(resourceNames),
    guid: req.query._id,
    elements: requestElements,
  };
  const validatedGetFhirDataFromHcSettings = validateSettings(getFhirDataFromHcSettings);
  if (!_.isEmpty(validatedGetFhirDataFromHcSettings.err)) {
    res.json(404, {
      message: 'Invalid settings entered',
      success: false,
      errors: validatedGetFhirDataFromHcSettings.err,
    });
    return next(false);
  }

  const getFhirDataFromHcProcessor = pumpProcessorProvider.getPumpProcessor(validatedGetFhirDataFromHcSettings);
  getFhirDataFromHcProcessor.checkInitialErrors()
    .then((errorMsg) => {
      if (errorMsg) {
        // code is 422 because settings are valid, but cannot be processed
        res.json(422, {
          message: errorMsg,
          success: false,
        });
        return next(false);
      }
    })
    .then(() => getFhirDataFromHcProcessor.processSettings())
    .then(() => {
      res.json(200, getFhirDataFromHcProcessor.result);
      return next();
    })
    .catch((err) => {
      res.json(500, {
        message: err,
        success: false,
      });
      return next(false);
    });
}

/**
 * Retrieves data in FHIR format from dataBridgeUrl for specified guid(if its empty all users will be retrieved),
 * transforms FHIR data to HC format,
 * retrieves user object from HC1(srcHcUrl)
 * and synchronizes user, pii, phi.myMedications, phi.myDevices with HC2 (destHcUrl).
 */
function syncUsersDevicesMeds (req, res, next) {
  const inputSettings = req.body;
  inputSettings.type = 'syncUsersDevicesMeds';
  const validatedSettings = validateSettings(inputSettings);
  if (!_.isEmpty(validatedSettings.err)) {
    res.json(400, {
      message: 'Invalid settings entered',
      success: false,
      errors: validatedSettings.err,
    });
    return next(false);
  }

  const { dataBridgeUrl, destHcUrl, guid } = validatedSettings;
  let url = `${dataBridgeUrl}/Patient?_revinclude=Device:patient&_revinclude=MedicationRequest:subject`;
  url = guid ? `${url}&_id=${guid}` : url;

  fetch(url)
    .then((res) => {
      if (res.status === 200) {
        return res.json();
      }
      res.json(422, { message: `Data bridge sends invalid status code: ${res.status}`, success: false });
      return next(false);
    })
    .then((fhirData) => {
      const transformFhirDataToHcSettings = {
        type: 'transformFhirDataToHc',
        requiredFields: ['piis', 'piis_demographics', 'phis_myDevices', 'phis_myMedications'],
        entries: fhirData.entry,
      };
      const transformFhirDataToHcProcessor = pumpProcessorProvider.getPumpProcessor(transformFhirDataToHcSettings);
      return transformFhirDataToHcProcessor.processSettings();
    })
    .then((hcUsersData) => {
      const syncUsersDevicesMedsSettings = {
        type: 'syncUsersDevicesMeds',
        destHcUrl,
        hcUsersData,
      };
      const syncUsersDevicesMedsProcessor = pumpProcessorProvider.getPumpProcessor(syncUsersDevicesMedsSettings);
      return syncUsersDevicesMedsProcessor.processSettings();
    })
    .then((message) => {
      res.json(200, { message, success: true });
      return next(true);
    })
    .catch((err) => {
      res.json(500, { err, success: false });
      return next(false);
    });
}

function syncAesRecalls (req, res, next) {
  const inputSettings = req.body;
  inputSettings.type = 'syncAesRecalls';
  const validatedSettings = validateSettings(inputSettings);
  if (!_.isEmpty(validatedSettings.err)) {
    res.json(400, {
      message: 'Invalid settings entered',
      success: false,
      errors: validatedSettings.err,
    });
    return next(false);
  }

  const { dataBridgeUrl, destHcUrl, guid } = validatedSettings;
  let url = `${dataBridgeUrl}/Patient?_revinclude=AdverseEvent:subject&_revinclude=Recall:patient`;
  url = guid ? `${url}&_id=${guid}` : url;

  fetch(url)
    .then((res) => {
      if (res.status === 200) {
        return res.json();
      }
      res.json(422, { message: `Data bridge sends invalid status code: ${res.status}`, success: false });
      return next(false);
    })
    .then((fhirData) => {
      const transformFhirDataToHcSettings = {
        type: 'transformFhirDataToHc',
        requiredFields: ['piis', 'piis_demographics', 'phis_myRecalls', 'phis_myAdverseEvents'],
        entries: fhirData.entry,
      };
      const transformFhirDataToHcProcessor = pumpProcessorProvider.getPumpProcessor(transformFhirDataToHcSettings);
      return transformFhirDataToHcProcessor.processSettings();
    })
    .then((hcUsersData) => {
      const syncAesRecallsSettings = {
        type: 'syncAesRecalls',
        destHcUrl,
        hcUsersData,
      };
      const syncAesRecallsProcessor = pumpProcessorProvider.getPumpProcessor(syncAesRecallsSettings);
      return syncAesRecallsProcessor.processSettings();
    })
    .then((message) => {
      res.json(200, { message, success: true });
      return next(true);
    })
    .catch((err) => {
      res.json(500, { err, success: false });
      return next(false);
    });
}

function appModelByFiles (req, res, next) {
  const filePaths = [];
  _.forEach(req.files, (file) => {
    const filePathExt = file.path + path.extname(file.name);
    fs.renameSync(file.path, filePathExt);
    filePaths.push(filePathExt);
  });
  // TODO: define how to pass backendMetaschema from request
  const backendMetaschema = null; // req.context.backendMetaschema;
  transformFilesToModel(filePaths, backendMetaschema)
    .then((model) => {
      res.json(200, { appModel: model, success: true });
    })
    .catch((err) => {
      res.json(400, { error: `Not supported extension`, success: false });
    });
}

server.post('/pump', pump);
server.get('/Patient', getPatientFhirData);
server.post('/syncUsersDevicesMeds', syncUsersDevicesMeds);
server.post('/syncAesRecalls', syncAesRecalls);

server.post('/appModelByFiles', upload.single(), appModelByFiles);

server.listen(process.env.APP_PORT, () => {
  console.log('%s listening at port %s', server.name, process.env.APP_PORT);
});
