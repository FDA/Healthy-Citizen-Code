const datapumps = require('datapumps');

datapumps.Buffer.defaultBufferSize(10000);
const { Group } = datapumps;
const SettingsProvider = require('./../settings_provider');

const settingsProvider = new SettingsProvider();

/**
 * Gets medical devices, medications, guid data in HC format from FHIR entries
 *
 * Algorithm by steps:
 * 1) Group FHIR entries
 * 2) Transform FHIR data to HC
 */
class TransformFhirDataToHcProcessor extends Group {
  constructor (inputSettings) {
    super();
    this.inputSettings = inputSettings;
    this.etlTypeSettings = settingsProvider.getSettings('fhirToHc', inputSettings.requiredFields);
    // TODO sort out why its not working with global const variable
    this.pumpProcessorProvider = require('../pump_processor_provider');
    this.result = [];
    this.addPumps();
  }

  addPumps () {
    const { entries } = this.inputSettings;
    const groupedResourcesByPatient = [];
    // get patient indexes and slice by them to get group
    // for 1, 3, 7 we get 3 groups: 1-3, 3-7, 7
    const patientIndexes = [];
    _.forEach(entries, (entry, index) => {
      if (entry.resource.resourceType === 'Patient') {
        patientIndexes.push(index);
      }
    });
    patientIndexes.push(entries.length);
    for (let i = 0; i < patientIndexes.length - 1; i++) {
      groupedResourcesByPatient.push(entries.slice(patientIndexes[i], patientIndexes[i + 1]));
    }

    const groupedByPatientAndResourceType = _.map(groupedResourcesByPatient, group => _(group)
      .groupBy(entry => entry.resource.resourceType)
      .value());

    const pumpProcessor = this;
    const settings = {
      type: 'fhirToHc',
      requiredFields: pumpProcessor.inputSettings.requiredFields,
    };
    const fhirToHcProcessor = this.pumpProcessorProvider.getPumpProcessor(settings);
    this.addPump('FhirToHcTransform')
      .from(groupedByPatientAndResourceType)
      .process(group => new Promise((resolve) => {
        let hcDataForUser = {};
        settings.requiredFields.forEach((field) => {
          const etlTypeSetting = fhirToHcProcessor.etlTypeSettings[field];
          const { config } = etlTypeSetting;
          const transformationService = etlTypeSetting.transform;
          const transformedData = fhirToHcProcessor.transformData(group, config.transform, transformationService);
          const path = field.split('_');
          // root should be object, other elemets should be arrays
          let transformedObjectByPath;
          if (path.length === 1) {
            transformedObjectByPath = _.set({}, path, transformedData[0]);
          } else {
            transformedObjectByPath = _.set({}, path, transformedData);
          }
          hcDataForUser = _.merge(hcDataForUser, transformedObjectByPath);
        });

        // accumulate result
        pumpProcessor.result.push(hcDataForUser);
        resolve();
      }));
  }

  /**
   * Checks whether constructed pump processor is valid
   * @returns {Promise.<T>} promise with errors
   */
  checkInitialErrors () {
    return Promise.resolve();
  }

  processSettings () {
    console.log(`Started processing FHIR entries.`);
    const pumpProcessor = this;
    return this
      .logErrorsToConsole()
      .start()
      .whenFinished()
      .then(() => {
        if (!pumpProcessor.errorBuffer().isEmpty()) {
          console.error(`Errors: ${JSON.stringify(pumpProcessor.errorBuffer().getContent())}`);
          pumpProcessor.isSuccessful = false;
        } else {
          console.log(`Transformed data from FHIR to HC.`);
          pumpProcessor.isSuccessful = true;
        }
      })
      .then(() => pumpProcessor.result)
      .catch((err) => {
        console.error(`Pump failed with error: ${err}`);
        pumpProcessor.isSuccessful = false;
      });
  }
}

module.exports = TransformFhirDataToHcProcessor;
