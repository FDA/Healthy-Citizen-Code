import { MedicationRequest } from '../fhir/resources/medication-request';
import { extractRxCuiFromMedicationRequest } from './extract-codings.helper';

export function rxcuiFromMedicationRequest(options) {
  return MedicationRequest(options)
    .then(res => extractRxCuiFromMedicationRequest(res, options))
    .then(codingWithRxCui => codingWithRxCui.map(c => c.code));
}
