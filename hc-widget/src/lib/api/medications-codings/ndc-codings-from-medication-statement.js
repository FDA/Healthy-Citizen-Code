import { MedicationStatement } from '../fhir/resources/medication-statement';
import { extractCodingsWithNdcFromMedicationStatement } from './extract-codings.helper';

export function ndcCodingsFromMedicationStatement(options) {
  return MedicationStatement(options)
    .then(res => extractCodingsWithNdcFromMedicationStatement(res, options));
}
