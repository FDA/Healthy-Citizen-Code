const glob = require('glob');
const _ = require('lodash');
const fs = require('fs');
const commonTransformations = require('./transformation/common_transformations');

// Singleton settings provider class to read settings only once
let instance = null;
class SettingsProvider {
  // Think about lazy reading
  constructor () {
    if (instance) {
      return instance;
    }
    // Add another protocols here to map json configs and js transformation files
    this.etlTypeToConfigPath = {
      fhirToHc: 'src/etl_configs/fhir_to_hc',
      hcToFhir: 'src/etl_configs/hc_to_fhir',
    };
    this.readAllSettings();
    instance = this;
    return instance;
  }

  readAllSettings () {
    const settingsForAllEtlTypes = {};
    _.forOwn(this.etlTypeToConfigPath, (configPath, etlType) => {
      const configFiles = glob.sync(`${configPath}/**/*.json`);
      configFiles.forEach((configFile) => {
        try {
          const json = fs.readFileSync(configFile);
          // Skip empty files
          if (json.length !== 0) {
            const filename = configFile.substring(configFile.lastIndexOf('/') + 1, configFile.lastIndexOf('.'));
            const config = JSON.parse(json);
            _.set(settingsForAllEtlTypes, [etlType, filename, 'config'], config);

            // TODO: decide how to map config with transformation service
            // Currently approach is to add transformation service with the same name as config
            // Example: src/etl_configs/fhir_to_hc/phis/phis_deaths.json ->
            //  src/services/transformation/fhir_to_hc/phis/phis_deaths.js
            const transformationFile = configFile.replace('etl_configs', 'services/transformation').replace('.json', '.js');
            const transformationService = require.main.require(`./${transformationFile}`);
            _.set(settingsForAllEtlTypes, [etlType, filename, 'transform'], transformationService);
          }
        } catch (e) {
          throw new Error(`Unable to parse config: "${e.message}" in file "${configFile}".`);
        }
      });
    });
    this.settingsForAllEtlTypes = settingsForAllEtlTypes;
  }

  getSettings (etlType, requiredFields) {
    const etlTypeSettings = this.settingsForAllEtlTypes[etlType];
    // Empty requiredFields gives whole settings
    let settingsForRequiredFields;
    if (requiredFields) {
      settingsForRequiredFields = _.pick(etlTypeSettings, requiredFields);
    } else {
      settingsForRequiredFields = _.clone(etlTypeSettings);
    }
    // inject commonTransformations to specific field transformations
    _.forEach(settingsForRequiredFields, (settingsForField) => {
      _.merge(settingsForField.transform, commonTransformations);
    });
    return settingsForRequiredFields;
  }

  validateRequiredFields (etlType, requiredFields) {
    const etlTypeSettings = this.settingsForAllEtlTypes[etlType];
    const errors = {};
    requiredFields.forEach((requiredField) => {
      if (_.isEmpty(_.pick(etlTypeSettings, requiredField))) {
        if (errors['Missing fields']) {
          errors['Missing fields'].push(requiredField);
        } else {
          errors['Missing fields'] = [requiredField];
        }
      }
    });
    return errors;
  }
}
module.exports = SettingsProvider;
