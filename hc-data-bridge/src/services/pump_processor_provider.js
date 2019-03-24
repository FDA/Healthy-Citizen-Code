const FhirToHcPumpProcessor = require('./pump_processors/fhir_to_hc_pump_processor.js');
const HcToFhirPumpProcessor = require('./pump_processors/hc_to_fhir_pump_processor.js');
const ResearchToHcPumpProcessor = require('./pump_processors/research/research_to_hc_pump_processor.js');
const HcToResearchPumpProcessor = require('./pump_processors/research/hc_to_research_pump_processor.js');
const GetFhirDataFromHcProcessor = require('./pump_processors/get_fhir_data_from_hc_processor.js');
const TransformFhirDataToHcProcessor = require('./pump_processors/transform_fhir_data_to_hc_processor.js');
const SyncUsersDevicesMedsProcessor = require('./pump_processors/hc1_hc2/sync_users_devices_meds_processor.js');
const SyncAesRecallsProcessor = require('./pump_processors/hc1_hc2/sync_aes_recalls_processor.js');
const FhirBundlesLoader = require('./pump_processors/fhir_bundles_loader');
const RxcuiPumpProcessor = require('../services/rxnav/rxcui_pump_processor');
const DrugInteractionPumpProcessor = require('../services/rxnav/pump_drug_interactions');
const GinasPumpProcessor = require('../services/ginas/ginas_pump_processor');
const OpenFDACrawlLabels = require('./open_fda/open_fda_crawl_labels');

const etlTypeToPumpProcessor = {
  fhirToHc: FhirToHcPumpProcessor,
  hcToFhir: HcToFhirPumpProcessor,
  hcToResearch: HcToResearchPumpProcessor,
  researchToHc: ResearchToHcPumpProcessor,
  getFhirDataFromHc: GetFhirDataFromHcProcessor,
  transformFhirDataToHc: TransformFhirDataToHcProcessor,
  syncUsersDevicesMeds: SyncUsersDevicesMedsProcessor,
  syncAesRecalls: SyncAesRecallsProcessor,
  fhirBundlesLoader: FhirBundlesLoader,
  rxcuiToNdc: RxcuiPumpProcessor,
  drugInteraction: DrugInteractionPumpProcessor,
  ginasToMongo: GinasPumpProcessor,
  drugLabelsToMongo: OpenFDACrawlLabels,
};

/**
 * Returns an instance of concrete pump processor
 * @param inputSettings
 * @param bufferSize
 */
const getPumpProcessor = (inputSettings, bufferSize) => {
  const PumpProcessor = etlTypeToPumpProcessor[inputSettings.type];
  return new PumpProcessor(inputSettings, bufferSize);
};

module.exports = { getPumpProcessor };
