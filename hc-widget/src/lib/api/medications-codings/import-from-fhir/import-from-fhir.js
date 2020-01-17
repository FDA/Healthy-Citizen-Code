import {MedicationStatement} from '../../fhir/resources/medication-statement';
import { extractCodingsWithNdcFromMedicationStatement } from '../extract-codings.helper';
import { get } from '../../../utils/utils';
import { SUPPORTED_CODING_SYSTEMS } from '../../../../constants';

export function importFromFhir(options) {
  return MedicationStatement(options)
    .then((res) => {
      const codingsWithNdc = extractCodingsWithNdcFromMedicationStatement(res, options);

      return fetchMedications(res)
        .then((medications) => {
          return getUniqCodings(codingsWithNdc, medications)
        });
    });
}

function fetchMedications(res) {
  const medicationReferences = res.entry
    .map(e => get(e, 'resource.medicationReference.reference'))
    .filter(r => r);

  const medicationPromises = medicationReferences.map(r => {
    return fetch(r, options)
      .then(res => res.json())
      .catch(err => {
        console.log(err);
        return {};
      });
  });

  return Promise.all(medicationPromises);
}

function getUniqCodings(medicationsFromMedicationStatement, medications) {
  const medicationCodingsFromMedications = medications.map(m => {
    const coding = get(m, 'code.coding.0');
    if (!coding) {
      return null;
    }
    const system = coding.system;
    if (system === SUPPORTED_CODING_SYSTEMS.RXCUI) {
      // maintain compatibility with getRxcuiByNdc format
      coding.rxcui = [coding.code];
      return coding;
    } else if (system === SUPPORTED_CODING_SYSTEMS.NDC) {
      return coding;
    }
    return null;
  }).filter(coding => coding);

  const uniqCodingsMap = {};
  medicationCodingsFromMedications.concat(medicationsFromMedicationStatement).forEach(coding => {
    const key = coding.code + coding.system;
    if (!uniqCodingsMap[key]) {
      uniqCodingsMap[key] = coding;
    }
  });

  return Object.values(uniqCodingsMap);
}
