const myArgs = require('optimist').argv;
const _ = require('lodash');
const pumpProcessorProvider = require('./src/services/pump_processor_provider');
const validateSettings = require('./src/services/settings_validator');

const showHelp = () => {
  // TODO: split all params by mandatory and optional by each type
  console.log(`Required params: 
  - type - ETL type, defines source and destination protocols. Format: [fromProtocol]To[toProtocol]. Examples: fhirToHc, hcToFhir.
  - srcServer - source server with protocol [fromProtocol].
  - destServer - destination server with protocol [toProtocol].
  - patientId - id of a patient from 'srcServer'.
  - requiredFields - fields from 'srcServer' split by ',' that will be pumped from 'srcServer' to 'destServer'. Leave it empty if you want to pump all fields.
  - piiId - piiId needed for load stage on HC server
  - jwtToken - user's jwtToken to insert data in HC server`);
};

if ((myArgs.h) || (myArgs.help)) {
  showHelp();
  process.exit(0);
}

const inputSettings = _.clone(myArgs);
inputSettings.requiredFields = inputSettings.requiredFields ? inputSettings.requiredFields.split(',') : [];

const validatedSettings = validateSettings(inputSettings);
if (!_.isEmpty(validatedSettings.err)) {
  console.log('Invalid settings entered.\n' +
    `Errors: ${JSON.stringify(validatedSettings.err)}`);
  process.exit(1);
}

const pumpProcessor = pumpProcessorProvider.getPumpProcessor(validatedSettings);
pumpProcessor.checkInitialErrors()
  .then((errorMsg) => {
    if (errorMsg) {
      console.log(`Cannot connect to: ${errorMsg.join(', ')}`);
      process.exit(1);
    }
  })
  .then(() => pumpProcessor.processSettings())
  .then(() => {
    const code = pumpProcessor.isSuccessful ? 0 : 1;
    if (pumpProcessor.result) {
      console.log(`\nResult: ${JSON.stringify(pumpProcessor.result)}`);
    }
    process.exit(code);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
