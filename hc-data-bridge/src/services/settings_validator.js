const _ = require('lodash');
const { isValidUrl, isValidMongoDbUrl } = require('../lib/helper');
const SettingsProvider = require('./settings_provider');

const settingsProvider = new SettingsProvider();

const validateFhirToHcSettings = (settings) => {
  const data = _.pick(settings, ['type', 'srcServer', 'destServer', 'patientId', 'requiredFields', 'jwtToken', 'piiId', 'phiId', 'guid']);
  if (!isValidUrl(settings.srcServer)) {
    _.set(data, 'err.srcServer', `${settings.srcServer} is not a valid source server.`);
  }
  if (!isValidUrl(settings.destServer)) {
    _.set(data, 'err.destServer', `${settings.destServer} is not a valid destination server.`);
  }
  if (!settings.patientId) {
    _.set(data, 'err.patientId', `${settings.patientId} is not a valid patientId.`);
  }
  const requiredFieldsErrors = settingsProvider.validateRequiredFields(settings.type, settings.requiredFields);
  if (!_.isEmpty(requiredFieldsErrors)) {
    _.set(data, 'err.requiredFields', requiredFieldsErrors);
  }
  if (!settings.jwtToken) {
    _.set(data, 'err.jwtToken', `${settings.jwtToken} is not a valid jwtToken.`);
  }
  // if (!settings.piiId) {
  //   data.err.piiId = `${settings.piiId} is not a valid piiId.`;
  // }
  return data;
};

const validateHCToFhirSettings = (settings) => {
  const data = _.pick(settings, ['type', 'srcServer', 'destServer', 'requiredFields', 'jwtToken', 'piiId', 'phiId', 'guid']);

  if (!isValidUrl(settings.srcServer)) {
    _.set(data, 'err.srcServer', `${settings.srcServer} is not a valid source server.`);
  }
  if (!isValidUrl(settings.destServer)) {
    _.set(data, 'err.destServer', `${settings.destServer} is not a valid destination server.`);
  }
  const requiredFieldsErrors = settingsProvider.validateRequiredFields(settings.type, settings.requiredFields);
  if (!_.isEmpty(requiredFieldsErrors)) {
    _.set(data, 'err.requiredFields', requiredFieldsErrors);
  }
  if (!settings.jwtToken) {
    _.set(data, 'err.jwtToken', `${settings.jwtToken} is not a valid jwtToken.`);
  }
  // add specific validation for piiId and phiId
  // if (!settings.piiId) {
  //   _.set(data, "err.piiId", `${settings.piiId} is not a valid piiId.`);
  // }

  return data;
};

const validateHCToResearchSettings = (settings) => {
  const data = _.pick(settings, ['type', 'hcUrl', 'researchUrl']);
  if (!isValidMongoDbUrl(settings.hcUrl)) {
    _.set(data, 'err.hcUrl', `${settings.hcUrl} is not a valid mongodb url.`);
  }
  if (!isValidMongoDbUrl(settings.researchUrl)) {
    _.set(data, 'err.researchUrl', `${settings.researchUrl} is not a valid mongodb url.`);
  }

  return data;
};

const validateResearchToHCSettings = (settings) => {
  const data = _.pick(settings, ['type', 'hcUrl', 'researchUrl']);
  if (!isValidMongoDbUrl(settings.hcUrl)) {
    _.set(data, 'err.hcUrl', `${settings.hcUrl} is not a valid mongodb url.`);
  }
  if (!isValidMongoDbUrl(settings.researchUrl)) {
    _.set(data, 'err.researchUrl', `${settings.researchUrl} is not a valid mongodb url.`);
  }

  return data;
};

const validateGetFhirDataFromHcSettings = (settings) => {
  const data = _.pick(settings, ['type', 'hcUrl', 'guid', 'elements', 'requiredFields']);
  if (!isValidMongoDbUrl(settings.hcUrl)) {
    _.set(data, 'err.hcUrl', `${settings.hcUrl} is not a valid mongodb url.`);
  }
  // if guid is not specified - search for all, otherwise it should be a string
  if (settings.guid !== undefined && !_.isString(settings.guid)) {
    _.set(data, 'err.guid', `${settings.guid} is not a valid guid.`);
  }
  if (!_.isArray(settings.elements)) {
    _.set(data, 'err.elements', `${settings.elements} is not valid elements.`);
  }
  const requiredFieldsErrors = settingsProvider.validateRequiredFields('hcToFhir', settings.requiredFields);
  if (!_.isEmpty(requiredFieldsErrors)) {
    _.set(data, 'err.requiredFields', requiredFieldsErrors);
  }
  return data;
};

const validateSyncUsersDevicesMedsProcessorSettings = (settings) => {
  const data = _.pick(settings, ['type', 'dataBridgeUrl', 'destHcUrl', 'guid']);
  if (!isValidMongoDbUrl(settings.destHcUrl)) {
    _.set(data, 'err.destHcUrl', `${settings.destHcUrl} is not a valid mongodb url.`);
  }
  if (!isValidUrl(settings.dataBridgeUrl)) {
    _.set(data, 'err.dataBridgeUrl', `${settings.dataBridgeUrl} is not a valid url.`);
  }
  if (settings.guid !== undefined && !_.isString(settings.guid)) {
    _.set(data, 'err.guid', `${settings.guid} is not a valid guid.`);
  }
  return data;
};

const validateSyncAesRecallsProcessorSettings = (settings) => {
  const data = _.pick(settings, ['type', 'dataBridgeUrl', 'destHcUrl', 'guid']);
  if (!isValidMongoDbUrl(settings.destHcUrl)) {
    _.set(data, 'err.destHcUrl', `${settings.destHcUrl} is not a valid mongodb url.`);
  }
  if (!isValidUrl(settings.dataBridgeUrl)) {
    _.set(data, 'err.dataBridgeUrl', `${settings.dataBridgeUrl} is not a valid url.`);
  }
  if (settings.guid !== undefined && !_.isString(settings.guid)) {
    _.set(data, 'err.guid', `${settings.guid} is not a valid guid.`);
  }
  return data;
};

const validateFhirDataToHcProcessorSettings = (settings) => {
  const data = _.pick(settings, ['type', 'requiredFields', 'entries']);
  if (!_.isArray(settings.requiredFields)) {
    _.set(data, 'err.requiredFields', `${settings.requiredFields} must be an array.`);
  }
  const requiredFieldsErrors = settingsProvider.validateRequiredFields('fhirToHc', settings.requiredFields);
  if (!_.isEmpty(requiredFieldsErrors)) {
    _.set(data, 'err.requiredFields', requiredFieldsErrors);
  }
  if (!_.isArray(settings.entries)) {
    _.set(data, 'err.entries', `${settings.entries} must be an array.`);
  }
  return data;
};

const validateFhirBundlesLoaderSettings = (settings) => {
  const data = _.pick(settings, ['type', 'bundlesPath', 'mongoUrl']);
  if (!isValidMongoDbUrl(settings.mongoUrl)) {
    _.set(data, 'err.destHcUrl', `${settings.mongoUrl} is not a valid mongodb url.`);
  }
  if (!settings.bundlesPath) {
    _.set(data, 'err.bundlesPath', `Bundles path should not be empty.`);
  }
  return data;
};

const validateRxcuiToNdcSettings = (settings) => {
  const data = _.pick(settings, ['type', 'mongoUrl']);
  if (!isValidMongoDbUrl(settings.mongoUrl)) {
    _.set(data, 'err.destHcUrl', `${settings.mongoUrl} is not a valid mongodb url.`);
  }
  return data;
};

const validateMongoUrlSettings = (settings) => {
  const data = _.pick(settings, ['type', 'mongoUrl']);
  if (!isValidMongoDbUrl(settings.mongoUrl)) {
    _.set(data, 'err.mongoUrl', `${settings.mongoUrl} is not a valid mongodb url.`);
  }
  return data;
};

const etlTypesToValidation = {
  fhirToHc: validateFhirToHcSettings,
  hcToFhir: validateHCToFhirSettings,
  hcToResearch: validateHCToResearchSettings,
  researchToHc: validateResearchToHCSettings,
  getFhirDataFromHc: validateGetFhirDataFromHcSettings,
  syncUsersDevicesMeds: validateSyncUsersDevicesMedsProcessorSettings,
  syncAesRecalls: validateSyncAesRecallsProcessorSettings,
  transformFhirDataToHc: validateFhirDataToHcProcessorSettings,
  fhirBundlesLoader: validateFhirBundlesLoaderSettings,
  rxcuiToNdc: validateRxcuiToNdcSettings,
  drugInteraction: validateMongoUrlSettings,
  ginasToMongo: validateMongoUrlSettings,
  drugLabelsToMongo: validateMongoUrlSettings,
};

const validateSettings = (settings) => {
  if (!etlTypesToValidation[settings.type]) {
    return { err: { type: `${settings.type} is not a valid etl strategy.` } };
  }
  return etlTypesToValidation[settings.type](settings);
};

module.exports = validateSettings;
