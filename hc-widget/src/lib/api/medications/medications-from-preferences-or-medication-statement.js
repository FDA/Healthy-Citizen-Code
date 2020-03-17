import {preferencesQuery} from '../user-preferences/user-preferences';
import {ndcCodingsFromMedicationStatement} from '../medications-codings/ndc-codings-from-medication-statement';
import {resolveRxCuiByNdc} from '../medications-codings/resolve-rxcui-by-ndc';

/**
 * @typedef Medication
 * @property ndc11: String
 * @property brandName: String
 */

/**
 *
 * @param options
 *
 * @return {Promise<{} | {
 *  medications: Medication[]
 *  gender: String
 *  gender: String
 *  age: String
 *  geographicRegion: String
 * }>}
 */
export function fetchMedicationsFromUserPreferencesOrMedicationStatement(options) {
  return fetchMedications(options)
    .then(({ medications, ...other }) => {
      const promises = medications.map(fetchRxcuiWithTtyIn);

      return Promise.all(promises)
        .then(medications => medications.filter(v => v))
        .then((medications) => {
          return { medications, ...other };
        })
    });
}

function fetchMedications(options) {
  if (options.dataSource === 'userPreferences') {
    return preferencesQuery(options.udid);
  } else {
    return fetchMedicationsFromFhir(options);
  }
}

function fetchMedicationsFromFhir(options) {
  return ndcCodingsFromMedicationStatement(options)
    .then(mapCodingToPreferences);
}

function mapCodingToPreferences(codings) {
  return {
    medications: codings.map(({ code, display }) => {
      return {
        brandName: display,
        ndc11: code,
      }
    })
  };
}

function fetchRxcuiWithTtyIn(medication) {
  return resolveRxCuiByNdc(medication.ndc11)
    .then((rxcui) => {
      if (!rxcui) {
        return null;
      }

      medication.rxcui = rxcui;
      return medication;
    });
}
