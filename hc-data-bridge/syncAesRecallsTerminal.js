const myArgs = require('optimist').argv;
const _ = require('lodash');
const pumpProcessorProvider = require('./src/services/pump_processor_provider');
const validateSettings = require('./src/services/settings_validator');
const fetch = require('node-fetch');

const inputSettings = _.clone(myArgs);
const validatedSettings = validateSettings(inputSettings);
if (!_.isEmpty(validatedSettings.err)) {
  console.log('Invalid settings entered.\n' +
    `Errors: ${JSON.stringify(validatedSettings.err)}`);
  process.exit(1);
}

const { dataBridgeUrl, destHcUrl, guid } = validatedSettings;
let url = `${dataBridgeUrl}/Patient?_revinclude=AdverseEvent:subject&_revinclude=Recall:patient`;
url = guid ? `${url}&_id=${guid}` : url;

fetch(url, {})
  .then((res) => {
    if (res.status === 200) {
      return res.json();
    }
    console.log(`Data bridge sends invalid status code: ${res.status}`);
    process.exit(1);
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
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
