import AdverseEventApi from './adverse-events';
import MedicationApi from './medications';

export function ApiClient(CONFIG) {
  this.CONFIG = CONFIG;
  Object.assign(this, AdverseEventApi, MedicationApi);
}
